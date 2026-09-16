/**
 * Live integration test against the real WordPress/WooCommerce origin.
 *
 * Skipped unless BACKEND_INTEGRATION=1 and the WooCommerce source is selected,
 * so `npm test` stays hermetic and CI never depends on a third-party site being
 * up:
 *
 *   BACKEND_INTEGRATION=1 NEXT_PUBLIC_DATA_SOURCE=woocommerce \
 *     NEXT_PUBLIC_WORDPRESS_BASE_URL=https://himalayankoh.com/staging npm test
 *
 * `NEXT_PUBLIC_WORDPRESS_BASE_URL` (not the server-only `WORDPRESS_BASE_URL`) is
 * the one that matters for these reads: the storefront resolves product-by-slug
 * in a client component, so a deployment that sets only the server variable
 * renders a correct sitemap and an empty grid.
 *
 * Read-only by construction: the backend layer only issues GET requests. This
 * test never writes to WordPress, WooCommerce, their database, orders or
 * customers.
 *
 * Its real job is to prove the honesty contract end to end: when staging cannot
 * report a price, the model must carry `priceMin: null` and the UI label must
 * say so — never a fabricated number, SKU or stock state. Every number below was
 * observed from a live run rather than assumed, and the store is the same
 * staging store; if it changes size, this test should fail and be updated
 * deliberately.
 */

import { describe, expect, it } from 'vitest';

import { getCatalogProducts, lookupCatalogProduct } from './products';
import { fetchStoreProductsSafe } from './woocommerce';
import { wordpressRequestSafe } from './wordpress';
import { backendConfig, isWooCommerceDataSource } from './config';
import { formatPriceDisplay } from '../products/price';
import type { Product } from '../../data/products';

const enabled = process.env.BACKEND_INTEGRATION === '1';

/** Real WordPress media on the staging install — never a placeholder. */
const STAGING_MEDIA = /^https:\/\/himalayankoh\.com\/staging\/wp-content\/uploads\//;

/** The exact slug the storefront was exercised with, as a browser requested it. */
const OBSERVED_SLUG = 'himalayan-koh-edible-salt-grain';

function expectNothingInvented(product: Product) {
  // The contract, asserted for every product rather than behind a condition:
  // a commercial field is either a real reported value or explicitly unknown.
  expect(product.name.length).toBeGreaterThan(0);
  expect(product.slug.length).toBeGreaterThan(0);
  expect(product.priceMin).toBeNull();
  expect(product.priceMax ?? null).toBeNull();
  expect(product.price).toBe('');
  expect(product.sku).toBeNull();
  expect(product.stockStatus).toBe('unknown');
  expect(product.inStock).toBe(false);
  expect(formatPriceDisplay(product)).toBe('Price unavailable');
  expect(product.missing).toEqual(expect.arrayContaining(['price', 'sku', 'stockStatus']));

  // An image is real staging media, or explicitly absent.
  if (product.image) {
    expect(product.image).toMatch(STAGING_MEDIA);
  } else {
    expect(product.missing).toContain('images');
  }
}

describe.skipIf(!enabled || !isWooCommerceDataSource())('live WooCommerce backend', () => {
  it('is pointed at a configured origin', () => {
    expect(isWooCommerceDataSource()).toBe(true);
    expect(backendConfig.wordpressApiRoot).toMatch(/^https:\/\//);
  });

  it('reports the Store API product route as a WordPress fatal, not a parse error', async () => {
    const store = await fetchStoreProductsSafe({ perPage: 1 });

    // Observed live: HTTP 500 with an HTML error page. The browser therefore
    // sees a failed CORS fetch and the layer records a typed error. The previous
    // version of this test passed in both branches — `if (store.error) … else …`
    // with an always-true alternate — so it could not fail and proved nothing.
    expect(store.error).not.toBeNull();
    expect(store.products).toEqual([]);
  });

  it('still serves WordPress content and pages', async () => {
    const pages = await wordpressRequestSafe<unknown[]>('/wp/v2/pages', { params: { per_page: 1 } });
    expect(pages.error).toBeNull();
  });

  it('returns the real staging catalog and admits everything it cannot report', async () => {
    const { products, count, degraded, warnings } = await getCatalogProducts({ perPage: 100 });

    // Observed on the staging store: 11 published products, none of which can
    // report commercial data through any public route.
    expect(products.length).toBe(11);
    expect(count).toBe(11);

    // We are on the WordPress-core fallback, and the layer says so.
    expect(degraded).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);

    // Every product: real identity, real media, nothing commercial invented.
    for (const product of products) {
      expectNothingInvented(product);
    }

    // Slugs come from WordPress, not from the bundled demo catalog.
    expect(products.map((p) => p.slug)).toContain(OBSERVED_SLUG);

    // WordPress slugs are unique, so a pagination or merge bug cannot silently
    // render the same product twice.
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
  });

  it('resolves a real staging product by slug with its real image', async () => {
    const lookup = await lookupCatalogProduct(OBSERVED_SLUG);

    // Asserted unconditionally: the previous version wrapped this in
    // `if (lookup.product)`, so a null product made the test pass while the
    // capability it was named for was broken.
    expect(lookup.error).toBeNull();
    expect(lookup.product).not.toBeNull();
    expect(lookup.provenance).toBe('direct');

    const product = lookup.product!;
    expect(product.slug).toBe(OBSERVED_SLUG);
    expect(product.name.length).toBeGreaterThan(0);
    expect(product.image).toMatch(STAGING_MEDIA);
    expectNothingInvented(product);
  });

  it('returns null rather than a fabricated product for an unknown slug', async () => {
    const lookup = await lookupCatalogProduct('this-slug-does-not-exist-hk-000');
    expect(lookup.product).toBeNull();
    expect(lookup.provenance).toBeNull();
  });
});
