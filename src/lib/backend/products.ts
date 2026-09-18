/**
 * Catalog adapters and the browser's catalog client.
 *
 * This module owns the *source reads*: switching from Supabase to
 * WordPress/WooCommerce is a flag change rather than a rewrite, and both sources
 * emit `Product` (`src/data/products.ts`) — there is no second view model.
 *
 * ## Supabase source
 * Behaviour is intentionally identical to the pre-migration code paths, because
 * 'supabase' stays the default until WooCommerce parity is verified:
 *   - `productsApi` remains the query layer (it owns the `packing_profile:` gate
 *     that keeps half-configured products off the storefront);
 *   - `readCatalogProductBySlug` preserves the direct -> list-scan ->
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
 *
 * ## Two readers, on purpose
 * - **Raw** — `readCatalogProducts` / `readCatalogProductBySlug`. Everything the
 *   source reports, nothing withheld. The admin console reads this way, because
 *   the owner has to *see* an off-niche product in order to archive it.
 * - **Sealed** — `lib/backend/serverCatalog.ts`, which wraps these reads and drops
 *   what the storefront may not serve. Server renders and `/api/catalog` use it.
 *
 * ## The browser never reads a source
 * The client-facing functions at the bottom of this file hit `/api/catalog`, which
 * is the sealed read served over HTTP. A component that read the source itself
 * would put withheld products — names, categories, descriptions — on the wire and
 * only drop them afterwards, which is not the same as never sending them; and it
 * would need the source's credentials in the bundle.
 */

import type { Product } from '../../data/products';
import { storefrontProducts as demoProducts } from '../../data/products';
import { invalidateSharedReads, readShared } from '../catalog/readCache';
import { isSupabaseConfigured } from '../supabase/client';
import { productsApi } from '../supabase/api';
import { isHiddenActiveProduct } from '../supabase/api/products';
import { getFallbackProductBySlug, mapSupabaseProduct } from '../products/mapProduct';
import { normalizeProductSlug, productSlugFromName, slugsMatch } from '../products/slug';
import { isWooCommerceDataSource } from './config';
import {
  fetchAdminProductBySlug,
  fetchAdminProducts,
  fetchStoreProductsSafe,
  fetchWpCoreProducts,
} from './woocommerce';
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
/* Raw reads (admin, and the sealed server read)                        */
/* ------------------------------------------------------------------ */

/**
 * The catalog exactly as the source reports it, with nothing withheld.
 *
 * This is the admin's read: a product that is off-niche is still a product the
 * owner has to archive, so it must arrive. Storefront reads go through the sealed
 * wrapper in `./serverCatalog` instead.
 */
export async function readCatalogProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  return isWooCommerceDataSource() ? wooList(query) : supabaseList(query);
}

/** The catalog's answer for one slug, straight from the source. */
export async function readCatalogProductBySlug(
  slug: string,
  signal?: AbortSignal
): Promise<CatalogLookup> {
  return isWooCommerceDataSource() ? wooLookup(slug, signal) : supabaseLookup(slug, signal);
}

/* ------------------------------------------------------------------ */
/* Browser client                                                      */
/* ------------------------------------------------------------------ */

/**
 * Where the browser gets its catalog.
 *
 * A component that runs in the browser must not read the source itself: the
 * source carries products the storefront withholds, and reading it directly would
 * put those records — names, categories, descriptions — on the wire before any
 * filter ran. The browser therefore reads the server's answer (`/api/catalog`),
 * which is already scoped, and cannot re-scope it by editing a request.
 */
const CATALOG_ENDPOINT = '/api/catalog';

/** Called on the server, these would silently read nothing. Say so instead. */
function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error(
      'The storefront catalog client is browser-only. Server code reads through lib/backend/serverCatalog (sealed) or readCatalogProducts (raw, admin).'
    );
  }
}

function catalogEndpointUrl(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${CATALOG_ENDPOINT}?${query}` : CATALOG_ENDPOINT;
}

async function fetchCatalogJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`The catalog endpoint answered ${response.status}.`);
  }
  return (await response.json()) as T;
}

/**
 * The storefront's catalog, in the browser: one shared read of the server's
 * answer.
 *
 * `readShared` shares an in-flight request between components and reuses the
 * answer for a short window, so navigating between catalogue surfaces does not
 * re-read the catalogue on every mount.
 */
export async function getCatalogProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  assertBrowser();

  const key = JSON.stringify({
    perPage: query.perPage ?? null,
    page: query.page ?? null,
    search: query.search ?? null,
    categorySlug: query.categorySlug ?? null,
    isFeatured: query.isFeatured ?? null,
  });

  // A caller that can abort expects its own request; a cache would hand it a
  // promise it cannot cancel and keep the result afterwards.
  return readShared(
    `catalog:${key}`,
    () =>
      fetchCatalogJson<CatalogResult>(
        catalogEndpointUrl({
          perPage: query.perPage,
          page: query.page,
          search: query.search,
          category: query.categorySlug,
          featured: query.isFeatured,
        }),
        query.signal
      ),
    { noStore: Boolean(query.signal) }
  );
}

/** One product by slug, in the browser. */
export async function lookupCatalogProduct(
  slug: string,
  signal?: AbortSignal
): Promise<CatalogLookup> {
  assertBrowser();

  try {
    return await fetchCatalogJson<CatalogLookup>(catalogEndpointUrl({ slug }), signal);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { product: null, related: [], provenance: null, error: reason };
  }
}

/** Featured products for the homepage, in the browser. */
export async function getFeaturedCatalogProducts(limit = 4): Promise<Product[]> {
  assertBrowser();

  try {
    const { products } = await readShared(`catalog:featured:${limit}`, () =>
      fetchCatalogJson<{ products: Product[] }>(catalogEndpointUrl({ featured: 1, limit }))
    );
    return products.slice(0, limit);
  } catch (error) {
    console.error('Featured products could not be read from the catalog endpoint.', error);
    return [];
  }
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
