/**
 * Curated high-resolution product photography for verified catalog items.
 *
 * Provides dedicated photography for items where upstream WooCommerce or Supabase
 * has empty image arrays or low-resolution legacy assets.
 */

export const CURATED_PRODUCT_IMAGES: Record<string, readonly string[]> = {
  // 30 lbs Himalayan Salt Block & Salt Lick
  'himalayan-salt-block-30-lbs': [
    '/images/products/himalayan-salt-block-30lbs-hero.webp',
    '/images/products/himalayan-salt-block-30lbs-horse.webp',
    '/images/products/himalayan-salt-block-30lbs-cow.webp',
    '/images/products/himalayan-salt-block-30lbs-livestock.webp',
  ],
  'hk-lb-30lbs': [
    '/images/products/himalayan-salt-block-30lbs-hero.webp',
    '/images/products/himalayan-salt-block-30lbs-horse.webp',
    '/images/products/himalayan-salt-block-30lbs-cow.webp',
    '/images/products/himalayan-salt-block-30lbs-livestock.webp',
  ],
  'himalayan-salt-lick-30-lbs': [
    '/images/products/himalayan-salt-block-30lbs-hero.webp',
    '/images/products/himalayan-salt-block-30lbs-horse.webp',
    '/images/products/himalayan-salt-block-30lbs-cow.webp',
    '/images/products/himalayan-salt-block-30lbs-livestock.webp',
  ],
  'hk-lfh-30lbs': [
    '/images/products/himalayan-salt-block-30lbs-hero.webp',
    '/images/products/himalayan-salt-block-30lbs-horse.webp',
    '/images/products/himalayan-salt-block-30lbs-cow.webp',
    '/images/products/himalayan-salt-block-30lbs-livestock.webp',
  ],
};

export function resolveCuratedProductImages(
  slug: string,
  sku?: string | null,
  existingImages: string[] = []
): string[] {
  const normSlug = slug.toLowerCase().trim();
  const normSku = sku ? sku.toLowerCase().trim() : '';

  const curated =
    CURATED_PRODUCT_IMAGES[normSlug] ||
    (normSku ? CURATED_PRODUCT_IMAGES[normSku] : undefined);

  if (!curated || curated.length === 0) {
    return existingImages;
  }

  // Curated hero and lifestyle images first, followed by existing non-duplicate images
  return Array.from(new Set([...curated, ...existingImages]));
}
