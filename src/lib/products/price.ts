import type { Product } from '../../data/products';

/**
 * Price display rules, in one place.
 *
 * A catalog source may not be able to report a price (the WordPress core
 * product route cannot). In that case the model carries `priceMin: null` and an
 * empty `price`, and the UI must say so rather than showing `$0.00`.
 */

/** Rendered wherever a price would go but the source reported none. */
export const PRICE_UNAVAILABLE_LABEL = 'Price unavailable';

/** True only when a source actually reported a price. */
export function isPriceKnown(product: Pick<Product, 'priceMin'>): boolean {
  return typeof product.priceMin === 'number' && Number.isFinite(product.priceMin);
}

/** Display price, or the explicit unknown label. Never fabricates a number. */
export function formatPriceDisplay(product: Pick<Product, 'price' | 'priceMin'>): string {
  return isPriceKnown(product) && product.price ? product.price : PRICE_UNAVAILABLE_LABEL;
}

/**
 * Builds the display string for a resolved price range.
 *
 * `priceMax` is the top of a *variant* range, not a compare-at/discount price —
 * see the note on `Product.priceMax`. The " - " separator and the truthiness
 * check reproduce the long-standing Supabase mapper output exactly, so the two
 * backends cannot drift into different-looking prices.
 */
export function priceDisplayFromRange(priceMin: number | null, priceMax?: number | null): string {
  if (priceMin === null || !Number.isFinite(priceMin)) return '';
  const min = `$${priceMin.toFixed(2)}`;
  return priceMax ? `${min} - $${priceMax.toFixed(2)}` : min;
}

/** Catalog fields a source did not supply, so callers can render them as unknown. */
export function collectMissingCatalogFields(input: {
  priceMin: number | null;
  sku: string | null;
  stockStatus: Product['stockStatus'];
  images: string[];
}): string[] {
  const missing: string[] = [];
  if (input.priceMin === null) missing.push('price');
  if (input.sku === null) missing.push('sku');
  if (!input.stockStatus || input.stockStatus === 'unknown') missing.push('stockStatus');
  if (input.images.length === 0) missing.push('images');
  return missing;
}
