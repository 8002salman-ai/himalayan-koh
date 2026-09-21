import { describe, expect, it } from 'vitest';
import { productPath, productUrl } from './seo';

describe('catalog product route', () => {
  it('uses /products for admin preview and storefront links', () => {
    const product = { id: '2497', slug: 'himalayan-rock-salt-45-lbs-2-3-large-chunks' };
    expect(productPath(product)).toBe('/products/himalayan-rock-salt-45-lbs-2-3-large-chunks');
    expect(productUrl(product)).toContain('/products/himalayan-rock-salt-45-lbs-2-3-large-chunks');
  });

  it('falls back to the product id when a slug is absent', () => {
    expect(productPath({ id: '2497' })).toBe('/products/2497');
  });
});
