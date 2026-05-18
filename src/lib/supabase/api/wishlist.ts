import { supabase } from '../client';
import type { Wishlist, Product } from '../database.types';

export type WishlistWithProduct = Wishlist & {
  product: Product;
};

export const wishlistApi = {
  // Get user's wishlist
  async getWishlist(userId: string): Promise<WishlistWithProduct[]> {
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        *,
        product:products(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as WishlistWithProduct[];
  },

  // Add product to wishlist
  async addToWishlist(userId: string, productId: string): Promise<Wishlist> {
    const { data, error } = await supabase
      .from('wishlists')
      .insert({
        user_id: userId,
        product_id: productId,
      } as never)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Product already in wishlist');
      }
      throw error;
    }
    return data as Wishlist;
  },

  // Remove product from wishlist
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
  },

  // Check if product is in wishlist
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  // Toggle wishlist status
  async toggleWishlist(userId: string, productId: string): Promise<boolean> {
    const isInList = await this.isInWishlist(userId, productId);

    if (isInList) {
      await this.removeFromWishlist(userId, productId);
      return false;
    } else {
      await this.addToWishlist(userId, productId);
      return true;
    }
  },

  // Get wishlist count
  async getWishlistCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  },
};
