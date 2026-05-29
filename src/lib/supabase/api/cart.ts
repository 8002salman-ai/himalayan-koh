import { supabase } from '../client';
import type { Cart, CartItem, CartWithItems } from '../database.types';

// Generate a session ID for guest carts
export const getCartSessionId = (): string => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const cartApi = {
  // Get or create cart
  async getOrCreateCart(userId?: string): Promise<Cart> {
    const sessionId = getCartSessionId();

    // Try to find existing cart
    let query = supabase
      .from('carts')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data: existingCart, error: findError } = await query.maybeSingle();

    if (findError) throw findError;

    if (existingCart) {
      return existingCart as Cart;
    }

    // Create new cart
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert({
        user_id: userId || null,
        session_id: userId ? null : sessionId,
      } as never)
      .select()
      .single();

    if (createError) throw createError;
    return newCart as Cart;
  },

  // Get cart with items
  async getCartWithItems(userId?: string): Promise<CartWithItems | null> {
    const sessionId = getCartSessionId();

    let query = supabase
      .from('carts')
      .select(`
        *,
        cart_items(
          *,
          product:products(*)
        )
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data as CartWithItems | null;
  },

  // Add item to cart
  async addToCart(
    productId: string,
    quantity: number,
    unitPrice: number,
    grainSize?: string,
    userId?: string
  ): Promise<CartItem> {
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists
    let existingItemQuery = supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('product_id', productId);

    existingItemQuery = grainSize
      ? existingItemQuery.eq('grain_size', grainSize)
      : existingItemQuery.is('grain_size', null);

    const { data: existingItem } = await existingItemQuery.maybeSingle();

    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: (existingItem as CartItem).quantity + quantity } as never)
        .eq('id', (existingItem as CartItem).id)
        .select()
        .single();

      if (error) throw error;
      return data as CartItem;
    }

    // Create new item
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
        grain_size: grainSize || null,
        unit_price: unitPrice,
      } as never)
      .select()
      .single();

    if (error) throw error;
    return data as CartItem;
  },

  // Update cart item quantity
  async updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItem | null> {
    if (quantity <= 0) {
      await this.removeFromCart(itemId);
      return null;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity } as never)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data as CartItem;
  },

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  // Clear cart
  async clearCart(userId?: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error) throw error;
  },

  // Merge guest cart with user cart after login
  async mergeGuestCart(userId: string): Promise<void> {
    const sessionId = getCartSessionId();

    // Get guest cart
    const { data: guestCart } = await supabase
      .from('carts')
      .select('*, cart_items(*)')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!guestCart || !(guestCart as CartWithItems).cart_items?.length) return;

    // Get or create user cart (ensures cart exists)
    await this.getOrCreateCart(userId);

    // Move items from guest cart to user cart
    for (const item of (guestCart as CartWithItems).cart_items) {
      await this.addToCart(
        item.product_id,
        item.quantity,
        item.unit_price,
        item.grain_size || undefined,
        userId
      );
    }

    // Delete guest cart
    await supabase
      .from('carts')
      .delete()
      .eq('id', (guestCart as Cart).id);

    // Clear session ID
    localStorage.removeItem('cart_session_id');
  },

  // Get cart item count
  async getCartItemCount(userId?: string): Promise<number> {
    const cart = await this.getCartWithItems(userId);
    if (!cart) return 0;
    return cart.cart_items.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Get cart total
  async getCartTotal(userId?: string): Promise<number> {
    const cart = await this.getCartWithItems(userId);
    if (!cart) return 0;
    return cart.cart_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  },
};
