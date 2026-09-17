import { describe, expect, it } from 'vitest';

import type { Product } from '../../data/products';
import {
  PRICE_UNAVAILABLE_LABEL,
  collectMissingCatalogFields,
  formatPriceDisplay,
  isPriceKnown,
  priceDisplayFromRange,
} from './price';
import { buildProductPageSeo } from './productSeo';
import { buildProductStructuredData } from './productSchema';

/** A product whose price the source could not report. */
const unknownPriceProduct: Product = {
  id: 'test-1',
  slug: 'test-honesty-product',
  name: 'Salt Block',
  price: '',
  priceMin: null,
  image: '',
  category: 'Edible Cooking Salt',
  inStock: false,
  sku: null,
  stockStatus: 'unknown',
  missing: ['price', 'sku', 'stockStatus', 'images'],
};

const knownPriceProduct: Product = {
  ...unknownPriceProduct,
  price: '$49.95',
  priceMin: 49.95,
  inStock: true,
  sku: 'HK-LB-30LBS',
  stockStatus: 'in_stock',
  missing: [],
};

describe('priceDisplayFromRange', () => {
  it('returns an empty string — not $0.00 — when the price is unknown', () => {
    expect(priceDisplayFromRange(null)).toBe('');
    expect(priceDisplayFromRange(null, 17.95)).toBe('');
  });

  it('formats a single price and a variant range', () => {
    expect(priceDisplayFromRange(49.95)).toBe('$49.95');
    expect(priceDisplayFromRange(9.95, 17.95)).toBe('$9.95 - $17.95');
  });

  it('treats a zero top-of-range as no range, matching the legacy mapper', () => {
    expect(priceDisplayFromRange(9.95, 0)).toBe('$9.95');
  });
});

describe('isPriceKnown / formatPriceDisplay', () => {
  it('treats a null price as unknown', () => {
    expect(isPriceKnown(unknownPriceProduct)).toBe(false);
    expect(formatPriceDisplay(unknownPriceProduct)).toBe(PRICE_UNAVAILABLE_LABEL);
  });

  it('passes a real price through unchanged', () => {
    expect(isPriceKnown(knownPriceProduct)).toBe(true);
    expect(formatPriceDisplay(knownPriceProduct)).toBe('$49.95');
  });
});

describe('collectMissingCatalogFields', () => {
  it('names every field the source failed to supply', () => {
    expect(
      collectMissingCatalogFields({ priceMin: null, sku: null, stockStatus: 'unknown', images: [] })
    ).toEqual(['price', 'sku', 'stockStatus', 'images']);
  });

  it('is empty for a complete product', () => {
    expect(
      collectMissingCatalogFields({ priceMin: 1, sku: 'X', stockStatus: 'in_stock', images: ['a'] })
    ).toEqual([]);
  });
});

// A dollar amount with cents. Deliberately narrower than /\$\d/, which would
// also match the template's "orders over $50" shipping threshold.
const MONEY = /\$\d+\.\d{2}/;

describe('meta description honesty', () => {
  it('omits the price sentence entirely when no price was reported', () => {
    const { description } = buildProductPageSeo(unknownPriceProduct);

    expect(description).toBe(
      'Salt Block — a Himalayan pink salt block for grilling and serving. Unrefined, additive-free salt from Himalayan Koh.'
    );
    expect(description).not.toMatch(MONEY);
    expect(description).not.toMatch(/nan|NaN|null|undefined/);
  });

  it('keeps the known-price description byte-identical to the legacy output', () => {
    const { description } = buildProductPageSeo(knownPriceProduct);

    // The price clause is unchanged; only the shelf sentence moved, because the
    // description now follows the shelf the product is actually listed under.
    expect(description).toBe(
      'Salt Block — a Himalayan pink salt block for grilling and serving. $49.95. Unrefined, additive-free salt from Himalayan Koh.'
    );
    expect(description).not.toMatch(/nan|NaN|null|undefined/);
  });

  it('describes an edible product as edible, not as a block', () => {
    // Placement comes from the shelf taxonomy, so the meta sentence and the hub
    // the product appears on cannot disagree about what kind of salt this is.
    const jar: Product = {
      ...knownPriceProduct,
      name: 'Himalayan Pink Salt Jar 1 lb',
      category: 'Edible Cooking Salt',
    };

    expect(buildProductPageSeo(jar).description).toContain(
      'unrefined Himalayan pink salt with its natural trace minerals'
    );
  });

  it('says nothing about livestock for any product', () => {
    const { description } = buildProductPageSeo({ ...knownPriceProduct, name: 'Salt Block 30 lbs' });

    expect(description).not.toMatch(/livestock|herd|horse|cattle|deer|ranch/i);
  });
});

describe('Product structured data honesty', () => {
  it('omits the Offer node rather than publishing a price it does not have', () => {
    const graph = buildProductStructuredData(unknownPriceProduct)['@graph'] as Record<string, unknown>[];
    const productNode = graph.find((node) => node['@type'] === 'Product')!;

    expect(productNode).toBeDefined();
    expect(productNode.offers).toBeUndefined();
  });

  it('never publishes the internal id as a SKU', () => {
    const withNullSku = buildProductStructuredData(unknownPriceProduct)['@graph'] as Record<string, unknown>[];
    const node = withNullSku.find((entry) => entry['@type'] === 'Product')!;
    expect(node.sku).toBeUndefined();

    const withSku = buildProductStructuredData(knownPriceProduct)['@graph'] as Record<string, unknown>[];
    const nodeWithSku = withSku.find((entry) => entry['@type'] === 'Product')!;
    expect(nodeWithSku.sku).toBe('HK-LB-30LBS');
  });

  it('still publishes a complete Offer for a product with a real price', () => {
    const graph = buildProductStructuredData(knownPriceProduct)['@graph'] as Record<string, unknown>[];
    const offers = graph.find((node) => node['@type'] === 'Product')!.offers as Record<string, unknown>;

    expect(offers.price).toBe(49.95);
    expect(offers.priceCurrency).toBe('USD');
    expect(offers.availability).toBe('https://schema.org/InStock');
  });
});
