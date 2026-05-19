import type { Product } from '../../data/products';
import { products as fallbackProducts } from '../../data/products';
import type { ProductWithCategory } from '../supabase/database.types';

export function mapSupabaseProduct(product: ProductWithCategory): Product {
  return {
    id: product.id,
    slug: product.slug,
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
    inStock: product.inventory
      ? product.inventory.quantity > product.inventory.reserved_quantity
      : true,
    metaTitle: product.meta_title || undefined,
    metaDescription: product.meta_description || undefined,
  };
}

export function getFallbackProductBySlug(slug: string): Product | undefined {
  return fallbackProducts.find((product) => product.slug === slug);
}

export function buildProductJsonLd(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.metaDescription || product.description || product.name,
    image: product.image,
    sku: String(product.id),
    brand: {
      '@type': 'Brand',
      name: 'Himalayan Koh',
    },
    offers: {
      '@type': 'Offer',
      url: `https://himalayankoh.com/products/${product.slug}`,
      priceCurrency: 'USD',
      price: product.priceMin,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
}
