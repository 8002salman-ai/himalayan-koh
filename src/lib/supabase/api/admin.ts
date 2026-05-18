import { supabase } from '../client';
import type { Product, Category, Inventory } from '../database.types';

export interface ProductFormData {
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  weight_unit?: string;
  category_id?: string;
  images: string[];
  thumbnail?: string;
  is_active: boolean;
  is_featured: boolean;
  grain_sizes: string[];
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  // Inventory
  quantity?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  allow_backorder?: boolean;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order?: number;
  is_active: boolean;
}

export interface AdminProductFilters {
  search?: string;
  category_id?: string;
  is_active?: boolean;
  is_featured?: boolean;
  low_stock?: boolean;
  sortBy?: 'name' | 'price' | 'created_at' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const adminApi = {
  // ==================== PRODUCTS ====================

  // Get all products with filters (admin view - includes inactive)
  async getProducts(filters: AdminProductFilters = {}): Promise<{ 
    products: (Product & { category: Category | null; inventory: Inventory | null })[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }

    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    if (sortBy === 'quantity') {
      // Sort by inventory quantity requires a different approach
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    let products = (data || []) as (Product & { category: Category | null; inventory: Inventory | null })[];

    // Filter by low stock if needed
    if (filters.low_stock) {
      products = products.filter(p => {
        const inv = p.inventory;
        return inv && inv.quantity <= inv.low_stock_threshold;
      });
    }

    return {
      products,
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  // Get single product by ID
  async getProduct(id: string): Promise<Product & { category: Category | null; inventory: Inventory | null }> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Product & { category: Category | null; inventory: Inventory | null };
  },

  // Create product
  async createProduct(data: ProductFormData): Promise<Product> {
    const { quantity, low_stock_threshold, track_inventory, allow_backorder, ...productData } = data;

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        slug: productData.slug,
        description: productData.description || null,
        short_description: productData.short_description || null,
        price: productData.price,
        compare_at_price: productData.compare_at_price || null,
        cost_price: productData.cost_price || null,
        sku: productData.sku || null,
        barcode: productData.barcode || null,
        weight: productData.weight || null,
        weight_unit: productData.weight_unit || 'lbs',
        category_id: productData.category_id || null,
        images: productData.images || [],
        thumbnail: productData.thumbnail || productData.images?.[0] || null,
        is_active: productData.is_active,
        is_featured: productData.is_featured,
        grain_sizes: productData.grain_sizes || [],
        tags: productData.tags || [],
        meta_title: productData.meta_title || null,
        meta_description: productData.meta_description || null,
      } as never)
      .select()
      .single();

    if (productError) throw productError;

    // Create inventory record
    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert({
        product_id: (product as Product).id,
        quantity: quantity || 0,
        low_stock_threshold: low_stock_threshold || 10,
        track_inventory: track_inventory !== false,
        allow_backorder: allow_backorder || false,
      } as never);

    if (inventoryError) {
      // Rollback product creation
      await supabase.from('products').delete().eq('id', (product as Product).id);
      throw inventoryError;
    }

    return product as Product;
  },

  // Update product
  async updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
    const { quantity, low_stock_threshold, track_inventory, allow_backorder, ...productData } = data;

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        ...productData,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .select()
      .single();

    if (productError) throw productError;

    // Update inventory if provided
    if (quantity !== undefined || low_stock_threshold !== undefined || track_inventory !== undefined || allow_backorder !== undefined) {
      const inventoryUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (quantity !== undefined) inventoryUpdate.quantity = quantity;
      if (low_stock_threshold !== undefined) inventoryUpdate.low_stock_threshold = low_stock_threshold;
      if (track_inventory !== undefined) inventoryUpdate.track_inventory = track_inventory;
      if (allow_backorder !== undefined) inventoryUpdate.allow_backorder = allow_backorder;

      await supabase
        .from('inventory')
        .update(inventoryUpdate as never)
        .eq('product_id', id);
    }

    return product as Product;
  },

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    // Delete inventory first (cascade should handle this, but being explicit)
    await supabase.from('inventory').delete().eq('product_id', id);
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // Bulk update products
  async bulkUpdateProducts(ids: string[], updates: Partial<Pick<Product, 'is_active' | 'is_featured'>>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .in('id', ids);

    if (error) throw error;
  },

  // Bulk delete products
  async bulkDeleteProducts(ids: string[]): Promise<void> {
    await supabase.from('inventory').delete().in('product_id', ids);
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw error;
  },

  // ==================== CATEGORIES ====================

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as Category[];
  },

  async createCategory(data: CategoryFormData): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .insert(data as never)
      .select()
      .single();

    if (error) throw error;
    return category as Category;
  },

  async updateCategory(id: string, data: Partial<CategoryFormData>): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .update({ ...data, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return category as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // ==================== INVENTORY ====================

  async updateInventory(productId: string, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('inventory')
      .update({ quantity, updated_at: new Date().toISOString() } as never)
      .eq('product_id', productId);

    if (error) throw error;
  },

  async getLowStockProducts(): Promise<(Product & { inventory: Inventory })[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        inventory!inner(*)
      `)
      .eq('is_active', true);

    if (error) throw error;

    // Filter products where quantity <= low_stock_threshold
    return (data as (Product & { inventory: Inventory })[]).filter(
      p => p.inventory.quantity <= p.inventory.low_stock_threshold
    );
  },

  // ==================== IMAGE UPLOAD ====================

  async uploadProductImage(file: File, productId?: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId || 'new'}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async deleteProductImage(imageUrl: string): Promise<void> {
    // Extract file path from URL
    const urlParts = imageUrl.split('/products/');
    if (urlParts.length < 2) return;

    const filePath = `products/${urlParts[1]}`;
    
    const { error } = await supabase.storage
      .from('products')
      .remove([filePath]);

    if (error) console.error('Failed to delete image:', error);
  },

  async uploadCategoryImage(file: File, categoryId?: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${categoryId || 'new'}-${Date.now()}.${fileExt}`;
    const filePath = `categories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('categories')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    totalCategories: number;
    recentOrders: number;
    totalRevenue: number;
  }> {
    // Get product counts
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: activeProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get low stock count
    const lowStockProducts = await this.getLowStockProducts();

    // Get category count
    const { count: totalCategories } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total')
      .eq('payment_status', 'paid');

    const totalRevenue = (revenueData as { total: number }[] || []).reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalProducts: totalProducts || 0,
      activeProducts: activeProducts || 0,
      lowStockCount: lowStockProducts.length,
      totalCategories: totalCategories || 0,
      recentOrders: recentOrders || 0,
      totalRevenue,
    };
  },
};
