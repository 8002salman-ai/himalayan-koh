import { describe, expect, it } from 'vitest';
import { CURATED_PRODUCT_IMAGES, resolveCuratedProductImages } from './curatedImages';

describe('Curated product images for 30 lbs salt block and lick', () => {
  it('defines 4 high quality images for himalayan-salt-block-30-lbs and himalayan-salt-lick-30-lbs', () => {
    const blockImages = CURATED_PRODUCT_IMAGES['himalayan-salt-block-30-lbs'];
    expect(blockImages).toHaveLength(4);
    expect(blockImages[0]).toBe('/images/products/himalayan-salt-block-30lbs-hero.webp');
    expect(blockImages[1]).toBe('/images/products/himalayan-salt-block-30lbs-horse.webp');
    expect(blockImages[2]).toBe('/images/products/himalayan-salt-block-30lbs-cow.webp');
    expect(blockImages[3]).toBe('/images/products/himalayan-salt-block-30lbs-livestock.webp');

    const lickImages = CURATED_PRODUCT_IMAGES['himalayan-salt-lick-30-lbs'];
    expect(lickImages).toHaveLength(4);
    expect(lickImages).toEqual(blockImages);
  });

  it('matches by SKU case-insensitively', () => {
    const resolved = resolveCuratedProductImages('other-slug', 'HK-LB-30LBS', []);
    expect(resolved).toHaveLength(4);
    expect(resolved[0]).toBe('/images/products/himalayan-salt-block-30lbs-hero.webp');
  });

  it('matches by slug case-insensitively', () => {
    const resolved = resolveCuratedProductImages('HIMALAYAN-SALT-BLOCK-30-LBS', null, []);
    expect(resolved).toHaveLength(4);
    expect(resolved[0]).toBe('/images/products/himalayan-salt-block-30lbs-hero.webp');
  });

  it('prepends curated images before existing images while avoiding duplicates', () => {
    const existing = ['https://example.com/legacy-lick.jpg'];
    const resolved = resolveCuratedProductImages('himalayan-salt-lick-30-lbs', 'HK-LFH-30lbs', existing);
    expect(resolved).toHaveLength(5);
    expect(resolved[0]).toBe('/images/products/himalayan-salt-block-30lbs-hero.webp');
    expect(resolved[4]).toBe('https://example.com/legacy-lick.jpg');
  });

  it('returns existing images untouched when no curated images are mapped', () => {
    const existing = ['/images/products/pouch.webp'];
    const resolved = resolveCuratedProductImages('unrelated-product', 'HK-OTHER', existing);
    expect(resolved).toEqual(existing);
  });
});
