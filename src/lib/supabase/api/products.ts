import { normalizeProductSlug, productSlugFromName, slugsMatch } from '../../products/slug';
import { supabase } from '../client';
import type { Product, Category, ProductWithCategory } from '../database.types';

export interface ProductFilters {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  tags?: string[];
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name';
  limit?: number;
  offset?: number;
}

export const productsApi = {
  // Get all products with optional filters
  async getProducts(filters: ProductFilters = {}): Promise<{ products: ProductWithCategory[]; count: number }> {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `, { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (filters.categorySlug) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', filters.categorySlug)
        .single();
      
      if (category) {
        query = query.eq('category_id', (category as Category).id);
      }
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.isFeatured !== undefined) {
      query = query.eq('is_featured', filters.isFeatured);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { 
      products: data as ProductWithCategory[], 
      count: count || 0 
    };
  },

  // Get single product by slug
  async getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
    const normalizedSlug = normalizeProductSlug(slug);
    if (!normalizedSlug) return null;

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)
      .eq('slug', normalizedSlug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (data) return data as ProductWithCategory;

    // Slug in URL may come from productSlugFromName while DB slug differs or is stale.
    const { products } = await this.getProducts({ limit: 100 });
    return (
      products.find(
        (row) =>
          slugsMatch(row.slug, normalizedSlug) ||
          slugsMatch(productSlugFromName(row.name, row.slug), normalizedSlug)
      ) ?? null
    );
  },

  // Get single product by ID
  async getProductById(id: string): Promise<ProductWithCategory | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ProductWithCategory;
  },

  // Get featured products
  async getFeaturedProducts(limit = 6): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ProductWithCategory[];
  },

  // Get related products
  async getRelatedProducts(productId: string, categoryId: string | null, limit = 4): Promise<ProductWithCategory[]> {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)
      .eq('is_active', true)
      .neq('id', productId)
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as ProductWithCategory[];
  },

  // Search products
  async searchProducts(query: string, limit = 10): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get all categories
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get category by slug
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },
};
