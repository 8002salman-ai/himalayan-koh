import type { Product } from '../../data/products';
import { products as fallbackProducts } from '../../data/products';
import { productsApi } from '../supabase/api';
import { isHiddenActiveProduct } from '../supabase/api/products';
import { isSupabaseConfigured } from '../supabase/client';
import type { ProductWithCategory } from '../supabase/database.types';
import { getFallbackProductBySlug, mapSupabaseProduct } from './mapProduct';
import { normalizeProductSlug, productSlugFromName, slugsMatch } from './slug';

export interface ProductResolveDebug {
  routeParam: string;
  normalizedSlug: string;
  supabaseConfigured: boolean;
  supabaseDirectHit: boolean;
  listScanHit: boolean;
  fallbackCatalogHit: boolean;
  supabaseError: string | null;
  matchedSlug: string | null;
  matchedSource: 'direct' | 'list-scan' | 'fallback-catalog' | null;
}

export interface ResolvedProduct {
  product: Product | null;
  related: Product[];
  debug: ProductResolveDebug;
}

function logResolveDebug(debug: ProductResolveDebug) {
  if (process.env.NODE_ENV !== 'development') return;
  console.debug('[PDP] product resolve', debug);
}

function findInCatalog(slug: string): Product | undefined {
  return getFallbackProductBySlug(slug);
}

function rowMatchesSlug(row: ProductWithCategory, slug: string): boolean {
  return (
    slugsMatch(row.slug, slug) ||
    slugsMatch(productSlugFromName(row.name, row.slug), slug)
  );
}

function findInList(products: ProductWithCategory[], slug: string): ProductWithCategory | undefined {
  return products.find((row) => rowMatchesSlug(row, slug));
}

export async function resolveProductBySlug(routeSlug: string): Promise<ResolvedProduct> {
  const normalizedSlug = normalizeProductSlug(routeSlug);
  const debug: ProductResolveDebug = {
    routeParam: routeSlug,
    normalizedSlug,
    supabaseConfigured: isSupabaseConfigured(),
    supabaseDirectHit: false,
    listScanHit: false,
    fallbackCatalogHit: false,
    supabaseError: null,
    matchedSlug: null,
    matchedSource: null,
  };

  if (!normalizedSlug) {
    logResolveDebug(debug);
    return { product: null, related: [], debug };
  }

  if (!isSupabaseConfigured()) {
    const product = findInCatalog(normalizedSlug) || null;
    debug.fallbackCatalogHit = Boolean(product);
    debug.matchedSlug = product?.slug ?? null;
    debug.matchedSource = product ? 'fallback-catalog' : null;
    logResolveDebug(debug);
    return {
      product,
      related: fallbackProducts.filter((p) => !slugsMatch(p.slug, normalizedSlug)).slice(0, 3),
      debug,
    };
  }

  try {
    let row = await productsApi.getProductBySlug(normalizedSlug);

    if (!row) {
      const { products } = await productsApi.getProducts({ limit: 100 });
      row = findInList(products, normalizedSlug) ?? null;
      if (row) {
        debug.listScanHit = true;
      }
    } else {
      debug.supabaseDirectHit = true;
    }

    if (row) {
      const product = mapSupabaseProduct(row);
      debug.matchedSlug = product.slug;
      debug.matchedSource = debug.listScanHit ? 'list-scan' : 'direct';

      let related: Product[] = [];
      try {
        const relatedRows = await productsApi.getRelatedProducts(row.id, row.category_id, 3);
        related = relatedRows.map(mapSupabaseProduct);
      } catch {
        related = [];
      }

      logResolveDebug(debug);
      return { product, related, debug };
    }
  } catch (err) {
    debug.supabaseError = err instanceof Error ? err.message : String(err);
    console.error('[PDP] Supabase product lookup failed:', err);
  }

  // A real active row for this slug that's just withheld from the
  // storefront (no packing profile yet) must not be papered over by the
  // bundled demo catalog, which happens to reuse the same slugs.
  if (await isHiddenActiveProduct(normalizedSlug).catch(() => false)) {
    logResolveDebug(debug);
    return { product: null, related: [], debug };
  }

  const fallback = findInCatalog(normalizedSlug) || null;
  debug.fallbackCatalogHit = Boolean(fallback);
  debug.matchedSlug = fallback?.slug ?? null;
  debug.matchedSource = fallback ? 'fallback-catalog' : null;

  logResolveDebug(debug);
  return {
    product: fallback,
    related: fallback
      ? fallbackProducts.filter((p) => !slugsMatch(p.slug, normalizedSlug)).slice(0, 3)
      : [],
    debug,
  };
}
