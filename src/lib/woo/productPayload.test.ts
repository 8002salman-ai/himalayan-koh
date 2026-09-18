import { describe, expect, it } from 'vitest';

import {
  fromWooProduct,
  priceFields,
  sellingPrice,
  toWooProductBody,
  toWooVariationBody,
  variationLabel,
  variationPriceRange,
} from './productPayload';

describe('priceFields', () => {
  it('writes a plain price as the regular price and clears any sale', () => {
    expect(priceFields({ price: 9.95 })).toEqual({ regular_price: '9.95' });
  });

  it('turns a compare-at price into a real WooCommerce sale', () => {
    // The customer pays $9.95; $17.95 is the "was" price. Writing them the other
    // way round advertises the discount as the normal price.
    expect(priceFields({ price: 9.95, compareAtPrice: 17.95 })).toEqual({
      regular_price: '17.95',
      sale_price: '9.95',
    });
  });

  it('ends a sale when the compare-at price is removed', () => {
    expect(priceFields({ price: 9.95, compareAtPrice: null })).toEqual({
      regular_price: '9.95',
      sale_price: '',
    });
  });

  it('clears both fields when the price is cleared', () => {
    expect(priceFields({ price: null })).toEqual({ regular_price: '', sale_price: '' });
  });

  it('says nothing when the caller said nothing', () => {
    expect(priceFields({})).toEqual({});
  });
});

describe('toWooProductBody', () => {
  it('emits only the keys the caller supplied', () => {
    const body = toWooProductBody({ status: 'draft' });
    expect(body).toEqual({ status: 'draft' });
    expect('description' in body).toBe(false);
  });

  it('sends an empty SKU as an instruction to remove it', () => {
    expect(toWooProductBody({ sku: '' })).toEqual({ sku: '' });
  });

  it('omits the SKU entirely when it was not part of the patch', () => {
    expect('sku' in toWooProductBody({ name: 'Salt' })).toBe(false);
  });

  it('maps taxonomy and images to WooCommerce shapes', () => {
    const body = toWooProductBody({
      categoryIds: [75, 76],
      tags: ['pink salt'],
      images: ['https://example.test/a.jpg'],
    });
    expect(body.categories).toEqual([{ id: 75 }, { id: 76 }]);
    expect(body.tags).toEqual([{ name: 'pink salt' }]);
    expect(body.images).toEqual([{ src: 'https://example.test/a.jpg' }]);
  });

  it('writes SEO fields to the store plugin keys', () => {
    const body = toWooProductBody({ seo: { title: 'Pink salt', description: 'Fine grain' } });
    expect(body.meta_data).toEqual([
      { key: '_yoast_wpseo_title', value: 'Pink salt' },
      { key: '_yoast_wpseo_metadesc', value: 'Fine grain' },
    ]);
  });
});

describe('sellingPrice', () => {
  it('reads a sale as the price the customer pays', () => {
    expect(sellingPrice({ regular_price: '17.95', sale_price: '9.25' })).toEqual({
      price: 9.25,
      compareAtPrice: 17.95,
    });
  });

  it('reports no compare-at when the product is not on sale', () => {
    expect(sellingPrice({ regular_price: '9.95', sale_price: '' })).toEqual({
      price: 9.95,
      compareAtPrice: null,
    });
  });

  it('returns null rather than zero for an unpriced product', () => {
    expect(sellingPrice({ regular_price: '', sale_price: '' })).toEqual({
      price: null,
      compareAtPrice: null,
    });
  });
});

describe('fromWooProduct', () => {
  it('keeps absence as absence for price, SKU and stock quantity', () => {
    const record = fromWooProduct({
      id: 2461,
      name: 'Himalayan Pink Salt',
      slug: 'pink-salt',
      type: 'variable',
      status: 'publish',
      regular_price: '',
      sale_price: '',
      sku: '',
      stock_status: 'instock',
      stock_quantity: null,
      manage_stock: false,
    });

    expect(record.price).toBeNull();
    expect(record.sku).toBeNull();
    expect(record.stockQuantity).toBeNull();
    expect(record.type).toBe('variable');
    expect(record.stockStatus).toBe('instock');
  });

  it('reads the store availability status honestly', () => {
    expect(fromWooProduct({ id: 1, stock_status: 'outofstock' }).stockStatus).toBe('outofstock');
    expect(fromWooProduct({ id: 1, stock_status: 'nonsense' }).stockStatus).toBe('unknown');
    expect(fromWooProduct({ id: 1 }).stockStatus).toBe('unknown');
  });

  it('treats a non-publish status as not listed', () => {
    expect(fromWooProduct({ id: 1, status: 'draft' }).isListed).toBe(false);
    expect(fromWooProduct({ id: 1, status: 'trash' }).isListed).toBe(false);
    expect(fromWooProduct({ id: 1, status: 'publish' }).isListed).toBe(true);
  });
});

describe('variationPriceRange', () => {
  it('prefers a variation sale price over its regular price', () => {
    expect(
      variationPriceRange([
        { regular_price: '17.95', sale_price: '9.25' },
        { regular_price: '49.95' },
      ])
    ).toEqual({ min: 9.25, max: 49.95 });
  });

  it('reports one price for a single-priced product', () => {
    expect(variationPriceRange([{ regular_price: '9.95' }, { regular_price: '9.95' }])).toEqual({
      min: 9.95,
      max: 9.95,
    });
  });

  it('is null when no variation reports a price', () => {
    expect(variationPriceRange([{ regular_price: '' }, {}])).toBeNull();
    expect(variationPriceRange([])).toBeNull();
  });
});

describe('variationLabel', () => {
  it('joins the option values a customer chooses between', () => {
    expect(
      variationLabel({ id: 1, attributes: [{ option: 'Fine Grain' }, { option: '6 lbs' }] })
    ).toBe('Fine Grain / 6 lbs');
  });

  it('falls back to the variation id rather than showing nothing', () => {
    expect(variationLabel({ id: 2450, attributes: [] })).toBe('Variation 2450');
  });
});

describe('toWooVariationBody', () => {
  it('only sends the fields a variation edit touched', () => {
    expect(toWooVariationBody({ regularPrice: 12.5 })).toEqual({ regular_price: '12.50' });
  });

  it('clears a variation price on null, which is how a sale ends', () => {
    expect(toWooVariationBody({ salePrice: null })).toEqual({ sale_price: '' });
  });
});
