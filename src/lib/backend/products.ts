/**
 * Catalog adapter — the single entry point for catalog data.
 *
 * Every catalog read in the app goes through this module, so switching from
 * Supabase to WordPress/WooCommerce is a flag change rather than a rewrite.
 * Both sources emit `Product` (`src/data/products.ts`); there is no second view
 * model.
 *
 * ## Supabase source
 * Behaviour is intentionally identical to the pre-migration code paths, because
 * 'supabase' stays the default until WooCommerce parity is verified:
 *   - `productsApi` remains the query layer (it owns the `packing_profile:` gate
 *     that keeps half-configured products off the storefront);
 *   - `lookupCatalogProduct` preserves the direct -> list-scan ->
 *     hidden-active-guard -> demo-catalog order, so an admin's in-progress
 *     product is never republished from stale bundled demo data.
 *
 * ## WooCommerce source
 * Read order, best data first:
 *   1. WooCommerce REST v3 — complete, needs consumer key/secret. Server-only.
 *   2. WooCommerce Store API — public and complete, but currently a PHP fatal.
 *   3. WordPress core `/wp/v2/product` — always available, reports NO price,
 *      NO SKU and NO stock.
 * Step 3 is a *degradation*: prices stay `null` and stock stays `'unknown'`, and
 * the reason lands in `warnings`. The bundled demo catalog is never used here,
 * so nothing invented can reach a WooCommerce-powered page.
 */

import type { Product } from '../../data/products';
import { products as demoProducts } from '../../data/products';
import { isSupabaseConfigured } from '../supabase/client';
import { productsApi } from '../supabase/api';
import { isHiddenActiveProduct } from '../supabase/api/products';
import { getFallbackProductBySlug, mapSupabaseProduct } from '../products/mapProduct';
import { normalizeProductSlug, productSlugFromName, slugsMatch } from '../products/slug';
import { isWooCommerceDataSource } from './config';
import { fetchAdminProductBySlug, fetchAdminProducts, fetchStoreProductsSafe, fetchWpCoreProducts } from './woocommerce';
import type { ProductQuery } from './woocommerce';

export interface CatalogQuery {
  /** Omitted on the Supabase source means "no limit", matching the old default. */
  perPage?: number;
  page?: number;
  slug?: string;
  search?: string;
  categorySlug?: string;
  isFeatured?: boolean;
  signal?: AbortSignal;
}

export interface CatalogResult {
  products: Product[];
  count: number;
  /** True when the source could not fully serve the request and we fell back. */
  degraded: boolean;
  warnings: string[];
}

/** Where a resolved product came from, for the PDP's dev-mode diagnostics. */
export type CatalogProvenance = 'direct' | 'list-scan' | 'fallback-catalog';

export interface CatalogLookup {
  product: Product | null;
  related: Product[];
  provenance: CatalogProvenance | null;
  /** Exact backend error, when the lookup degraded. */
  error: string | null;
}

/* ------------------------------------------------------------------ */
/* Supabase source                                                     */
/* ------------------------------------------------------------------ */

async function supabaseList(query: CatalogQuery): Promise<CatalogResult> {
  const perPage = query.perPage;
  const offset = query.page && query.page > 1 ? (query.page - 1) * (perPage ?? 24) : undefined;

  const { products, count } = await productsApi.getProducts(
    {
      limit: perPage,
      offset,
      search: query.search,
      categorySlug: query.categorySlug,
      isFeatured: query.isFeatured,
    },
    { signal: query.signal }
  );

  return {
    products: products.map(mapSupabaseProduct),
    count,
    degraded: false,
    warnings: [],
  };
}

async function supabaseLookup(slug: string, signal?: AbortSignal): Promise<CatalogLookup> {
  const normalized = normalizeProductSlug(slug);
  if (!normalized) return { product: null, related: [], provenance: null, error: null };

  // No Supabase configured: the bundled demo catalog is the whole storefront,
  // which is how local development without credentials has always worked.
  if (!isSupabaseConfigured()) {
    const product = getFallbackProductBySlug(normalized) ?? null;
    return {
      product,
      related: relatedFromDemo(product, normalized),
      provenance: product ? 'fallback-catalog' : null,
      error: null,
    };
  }

  let error: string | null = null;

  try {
    let row = await productsApi.getProductBySlug(normalized, { signal });
    let listScanned = false;

    if (!row) {
      const { products } = await productsApi.getProducts({ limit: 100 }, { signal });
      row = products.find((candidate) => matchesSlug(candidate.slug, candidate.name, normalized)) ?? null;
      listScanned = Boolean(row);
    }

    if (row) {
      const product = mapSupabaseProduct(row);
      const related = await productsApi
        .getRelatedProducts(row.id, row.category_id, 3, { signal })
        .then((rows) => rows.map(mapSupabaseProduct))
        .catch(() => [] as Product[]);

      return {
        product,
        related,
        provenance: listScanned ? 'list-scan' : 'direct',
        error: null,
      };
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  // A real active row for this slug that is deliberately withheld from the
  // storefront (no packing profile yet) must not be papered over by the bundled
  // demo catalog, which reuses these same slugs.
  const hidden = await isHiddenActiveProduct(normalized).catch(() => false);
  if (hidden) return { product: null, related: [], provenance: null, error };

  const fallback = getFallbackProductBySlug(normalized) ?? null;
  return {
    product: fallback,
    related: relatedFromDemo(fallback, normalized),
    provenance: fallback ? 'fallback-catalog' : null,
    error,
  };
}

/** Mirrors the legacy list-scan matcher exactly (raw slug, then name-derived slug). */
function matchesSlug(rowSlug: string, rowName: string, slug: string): boolean {
  return slugsMatch(rowSlug, slug) || slugsMatch(productSlugFromName(rowName, rowSlug), slug);
}

function relatedFromDemo(product: Product | null, slug: string): Product[] {
  if (!product) return [];
  return demoProducts.filter((entry) => !slugsMatch(entry.slug, slug)).slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* WooCommerce source                                                  */
/* ------------------------------------------------------------------ */

function toProductQuery(query: CatalogQuery): ProductQuery {
  return {
    perPage: query.perPage ?? 24,
    page: query.page,
    slug: query.slug,
    search: query.search,
    category: query.categorySlug,
    featured: query.isFeatured,
    signal: query.signal,
  };
}

async function wooList(query: CatalogQuery): Promise<CatalogResult> {
  const warnings: string[] = [];

  try {
    const admin = await fetchAdminProducts(toProductQuery(query));
    if (admin) return { products: admin, count: admin.length, degraded: false, warnings: [] };
    warnings.push(
      'WooCommerce REST v3 skipped: WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET are not configured.'
    );
  } catch (error) {
    warnings.push(`WooCommerce REST v3 failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const store = await fetchStoreProductsSafe(toProductQuery(query));
  if (!store.error && store.products.length > 0) {
    return { products: store.products, count: store.products.length, degraded: false, warnings };
  }
  if (store.error) warnings.push(`WooCommerce Store API failed: ${store.error}`);

  const core = await fetchWpCoreProducts(toProductQuery(query));
  if (core.error) warnings.push(`WordPress core product fallback failed: ${core.error}`);
  warnings.push(
    'Showing WordPress-core product data only: price, SKU and stock are unavailable and are reported as unknown rather than inferred.'
  );

  return { products: core.products, count: core.products.length, degraded: true, warnings };
}

async function wooLookup(slug: string, signal?: AbortSignal): Promise<CatalogLookup> {
  const normalized = normalizeProductSlug(slug);
  if (!normalized) return { product: null, related: [], provenance: null, error: null };

  try {
    const admin = await fetchAdminProductBySlug(normalized, signal);
    if (admin) return { product: admin, related: [], provenance: 'direct', error: null };
  } catch {
    /* fall through to the public routes */
  }

  const store = await fetchStoreProductsSafe({ slug: normalized, perPage: 1, signal });
  if (store.products.length > 0) {
    return { product: store.products[0], related: [], provenance: 'direct', error: null };
  }

  const core = await fetchWpCoreProducts({ slug: normalized, perPage: 1, signal });
  if (core.products.length > 0) {
    return { product: core.products[0], related: [], provenance: 'direct', error: core.error };
  }

  // No demo-catalog fallback on this source: an unknown slug is genuinely
  // unknown, and inventing a product here would be the worst possible outcome.
  return { product: null, related: [], provenance: null, error: store.error };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Reads the product catalog through the configured source. */
export async function getCatalogProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  return isWooCommerceDataSource() ? wooList(query) : supabaseList(query);
}

/** Resolves one product by slug, preserving the Supabase fallback semantics. */
export async function lookupCatalogProduct(slug: string, signal?: AbortSignal): Promise<CatalogLookup> {
  return isWooCommerceDataSource() ? wooLookup(slug, signal) : supabaseLookup(slug, signal);
}

/** Featured products for the homepage. */
export async function getFeaturedCatalogProducts(limit = 4): Promise<Product[]> {
  if (!isWooCommerceDataSource()) {
    const rows = await productsApi.getFeaturedProducts(limit);
    return rows.map(mapSupabaseProduct);
  }
  const { products } = await wooList({ perPage: limit, isFeatured: true });
  return products.slice(0, limit);
}
