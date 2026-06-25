import type { Product } from '../../data/products';
import { products as fallbackProducts } from '../../data/products';
import type { Inventory, ProductWithCategory } from '../supabase/database.types';
import { getFallbackProductBySlug as findFallbackBySlug, normalizeProductSlug, productSlugFromName, slugsMatch } from './slug';

function inventoryRow(inventory: ProductWithCategory['inventory']) {
  if (!inventory) return null;
  return Array.isArray(inventory) ? inventory[0] : inventory;
}

export function mapSupabaseProduct(product: ProductWithCategory): Product {
  const inventory = inventoryRow(product.inventory) as Inventory | null;

  return {
    id: product.id,
    slug: productSlugFromName(product.name, product.slug),
    name: product.name,
    price: product.compare_at_price
      ? `$${product.price.toFixed(2)} - $${product.compare_at_price.toFixed(2)}`
      : `$${product.price.toFixed(2)}`,
    priceRange: Boolean(product.compare_at_price),
    priceMin: product.price,
    priceMax: product.compare_at_price || undefined,
    image: product.thumbnail || product.images?.[0] || '',
    category: product.category?.name || 'Uncategorized',
    description: product.description || product.short_description || undefined,
    grainSizes: product.grain_sizes,
    inStock: inventory
      ? inventory.quantity > inventory.reserved_quantity
      : true,
    metaTitle: product.meta_title || undefined,
    metaDescription: product.meta_description || undefined,
    isFeatured: product.is_featured,
  };
}

export function getFallbackProductBySlug(slug: string): Product | undefined {
  return findFallbackBySlug(fallbackProducts, slug);
}

export { normalizeProductSlug, productSlugFromName, slugsMatch };

export { buildProductStructuredData as buildProductJsonLd } from './productSchema';
