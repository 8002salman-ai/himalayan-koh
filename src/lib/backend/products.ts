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

import { cache } from 'react';
import type { Product } from '../../data/products';
import { storefrontProducts as demoProducts } from '../../data/products';
import { invalidateSharedReads, readShared } from '../catalog/readCache';
import { isSupabaseConfigured } from '../supabase/client';
import { productsApi } from '../supabase/api';
import { isHiddenActiveProduct } from '../supabase/api/products';
import { getFallbackProductBySlug, mapSupabaseProduct } from '../products/mapProduct';
import { normalizeProductSlug, productSlugFromName, slugsMatch } from '../products/slug';
import { countOffNicheProducts, filterNicheProducts, isNicheProduct } from '../catalog/niche';
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

/**
 * The Supabase catalog read, reported rather than thrown.
 *
 * Both sources honour the same contract: a catalog that cannot be read returns
 * nothing *and says so*, instead of throwing through a page render. Supabase is
 * optional here and is pointed at a sentinel host in environments that run
 * without it, where the query rejects with a DNS failure — which used to fail the
 * sitemap's prerender and take a whole deployment build down with it.
 *
 * The fallback is an empty catalog, never the bundled demo list: substituting
 * someone else's inventory for a failed read is how a storefront ends up
 * advertising products it cannot sell.
 */
async function supabaseList(query: CatalogQuery): Promise<CatalogResult> {
  const perPage = query.perPage;
  const offset = query.page && query.page > 1 ? (query.page - 1) * (perPage ?? 24) : undefined;

  try {
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
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      products: [],
      count: 0,
      degraded: true,
      warnings: [
        `The Supabase catalog could not be read (${reason}). No products are shown, because the bundled demo catalog is not this store's inventory.`,
      ],
    };
  }
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

/**
 * Related products from the bundled catalog.
 *
 * Reads the storefront-scoped list, so a recommendation can never surface a
 * product the catalog itself would not serve.
 */
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

/**
 * Storefront reads are scoped to the store's niche.
 *
 * `lib/catalog/niche.ts` is the single judgement about what belongs on the
 * public site (Himalayan pink salt, no livestock or pet products). Applying it
 * here — at the one seam every public surface already goes through — is what
 * keeps the homepage, search, related products, category pages, sitemap and
 * structured data from each filtering differently, or forgetting to.
 *
 * The admin console reads the same source through `readCatalogProducts` below,
 * which deliberately skips this filter: the owner has to *see* an off-niche
 * product in the console in order to archive it, so hiding it there would hide it
 * from the only person who can fix it.
 */
function scopeToNiche(result: CatalogResult): CatalogResult {
  const excluded = countOffNicheProducts(result.products);
  if (excluded === 0) return result;

  const products = filterNicheProducts(result.products);
  return {
    products,
    count: Math.max(0, result.count - excluded),
    degraded: result.degraded,
    warnings: [
      ...result.warnings,
      `${excluded} product${excluded === 1 ? '' : 's'} outside the Himalayan pink salt niche ${excluded === 1 ? 'was' : 'were'} withheld from the storefront. Archive them in WooCommerce to remove this notice — see docs/HIMALAYAN-PINK-SALT-NICHE-AUDIT.md.`,
    ],
  };
}

/**
 * The catalog exactly as the source reports it, with nothing withheld.
 *
 * This is the admin's read: a product that is off-niche is still a product the
 * owner has to archive, so it must arrive. Storefront reads go through
 * `getCatalogProducts` instead.
 */
export async function readCatalogProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  return isWooCommerceDataSource() ? wooList(query) : supabaseList(query);
}

/**
 * A stable cache key for a catalog query.
 *
 * Only the fields that change the answer are included, so two callers asking for
 * the same page of the same catalogue share one read, and a caller that passes an
 * equivalent query in a different object shape still hits it.
 */
function catalogQueryKey(query: CatalogQuery): string {
  return JSON.stringify({
    perPage: query.perPage ?? null,
    page: query.page ?? null,
    slug: query.slug ?? null,
    search: query.search ?? null,
    categorySlug: query.categorySlug ?? null,
    isFeatured: query.isFeatured ?? null,
  });
}

/**
 * Per-request memo for the server read.
 *
 * `/products` reads the catalogue twice in one request — once for the metadata
 * (the category noindex decision, the AggregateOffer price range) and once for
 * the page — and the sitemap reads it too. Without this memo each of those issued
 * its own upstream request chain. React's `cache` scopes the result to the current
 * request, so two renders in the same request share a read while a later request
 * always re-reads: stock stays fresh, and nothing is cached across visitors.
 */
const readCatalogForRequest = cache(async (key: string): Promise<CatalogResult> =>
  readCatalogProducts(JSON.parse(key) as CatalogQuery)
);

/**
 * The storefront's catalog: the source's catalog, scoped to the store's niche.
 *
 * Server renders share one read per request (above). In the browser the same read
 * goes through `readShared`, which shares an in-flight request between components
 * and reuses the answer for a short window instead of every catalogue surface
 * re-reading the whole catalogue on mount.
 */
export async function getCatalogProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  const key = catalogQueryKey(query);

  if (typeof window === 'undefined') {
    return scopeToNiche(await readCatalogForRequest(key));
  }

  // A caller that can abort expects its own request; a cache would hand it a
  // promise it cannot cancel and keep the result afterwards.
  const result = await readShared(
    `catalog:${key}`,
    () => readCatalogProducts(query),
    { noStore: Boolean(query.signal) }
  );
  return scopeToNiche(result);
}

/**
 * Drop the browser cache of catalog reads.
 *
 * Called when the catalogue is known to have changed (a realtime product event),
 * so the next read is fresh instead of waiting out the TTL.
 */
export function invalidateCatalogReads(): void {
  invalidateSharedReads();
}

/**
 * Resolves one product by slug, preserving the Supabase fallback semantics.
 *
 * An off-niche product resolves to *nothing* rather than to itself: a direct hit
 * is how a link, a search result or a shared URL would otherwise reach a product
 * the storefront is not allowed to serve.
 */
export async function lookupCatalogProduct(slug: string, signal?: AbortSignal): Promise<CatalogLookup> {
  const lookup = isWooCommerceDataSource()
    ? await wooLookup(slug, signal)
    : await supabaseLookup(slug, signal);

  if (lookup.product && !isNicheProduct({ name: lookup.product.name, category: lookup.product.category })) {
    return { product: null, related: [], provenance: null, error: lookup.error };
  }
  return lookup;
}

/**
 * Featured products for the homepage.
 *
 * The WooCommerce branch goes through the same sharing rules as the main list
 * read: memoized per request on the server, and served from the browser's shared
 * read cache so a homepage visit does not re-read the catalogue on every mount.
 * The Supabase branch keeps its own behaviour — a failed featured read costs the
 * homepage its row, never the page.
 */
const readFeaturedForRequest = cache(async (limit: number): Promise<Product[]> => {
  const { products } = await wooList({ perPage: limit, isFeatured: true });
  return products;
});

export async function getFeaturedCatalogProducts(limit = 4): Promise<Product[]> {
  if (!isWooCommerceDataSource()) {
    try {
      const rows = await productsApi.getFeaturedProducts(limit);
      return filterNicheProducts(rows.map(mapSupabaseProduct)).slice(0, limit);
    } catch (error) {
      console.error('Featured products could not be read from Supabase.', error);
      return [];
    }
  }

  const products =
    typeof window === 'undefined'
      ? await readFeaturedForRequest(limit)
      : await readShared(`catalog:featured:${limit}`, async () => {
          const { products: featured } = await wooList({ perPage: limit, isFeatured: true });
          return featured;
        });

  return filterNicheProducts(products).slice(0, limit);
}
