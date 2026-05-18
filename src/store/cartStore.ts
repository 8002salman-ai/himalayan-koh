import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { cartApi } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';
import type { CartWithItems } from '../lib/supabase/database.types';

export interface CartItem {
  id: string;
  cartItemId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  grainSize?: string;
}

let cartItems: CartItem[] = [];
let listeners: Set<() => void> = new Set();
let loadedForUserId: string | null | undefined;
let isLoadingCart = false;
const localCartKey = 'cart_items';

function emitChange() {
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cartItems;
}

function saveLocalCart() {
  if (!isSupabaseConfigured()) {
    localStorage.setItem(localCartKey, JSON.stringify(cartItems));
  }
}

function getItemKey(id: string, grainSize?: string) {
  return `${id}:${grainSize || ''}`;
}

function mapSupabaseCart(cart: CartWithItems | null): CartItem[] {
  if (!cart) return [];

  return cart.cart_items.map((item) => ({
    id: item.product_id,
    cartItemId: item.id,
    name: item.product?.name || 'Unknown Product',
    price: item.unit_price,
    image: item.product?.thumbnail || item.product?.images?.[0] || '',
    quantity: item.quantity,
    grainSize: item.grain_size || undefined,
  }));
}

async function loadCart(userId?: string) {
  if (isLoadingCart || loadedForUserId === userId) return;

  isLoadingCart = true;
  try {
    if (!isSupabaseConfigured()) {
      const storedCart = localStorage.getItem(localCartKey);
      cartItems = storedCart ? JSON.parse(storedCart) as CartItem[] : [];
    } else {
      if (userId) {
        await cartApi.mergeGuestCart(userId);
      }
      const cart = await cartApi.getCartWithItems(userId);
      cartItems = mapSupabaseCart(cart);
    }
    loadedForUserId = userId;
    emitChange();
  } catch (err) {
    console.error('Failed to load cart:', err);
  } finally {
    isLoadingCart = false;
  }
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot);
  const { user } = useAuthContext();
  const userId = user?.id;

  useEffect(() => {
    loadCart(userId);
  }, [userId]);

  const addItem = useCallback(async (item: Omit<CartItem, 'quantity' | 'cartItemId'>, quantity = 1) => {
    const productId = String(item.id);

    if (isSupabaseConfigured()) {
      await cartApi.addToCart(productId, quantity, item.price, item.grainSize, userId);
      const cart = await cartApi.getCartWithItems(userId);
      cartItems = mapSupabaseCart(cart);
      loadedForUserId = userId;
      emitChange();
      return;
    }

    const existing = cartItems.find(
      ci => getItemKey(ci.id, ci.grainSize) === getItemKey(productId, item.grainSize)
    );
    if (existing) {
      existing.quantity += quantity;
      cartItems = [...cartItems];
    } else {
      cartItems = [...cartItems, { ...item, id: productId, quantity }];
    }
    saveLocalCart();
    emitChange();
  }, [userId]);

  const removeItem = useCallback(async (id: string, grainSize?: string) => {
    const item = cartItems.find(
      ci => getItemKey(ci.id, ci.grainSize) === getItemKey(id, grainSize)
    );

    if (isSupabaseConfigured() && item?.cartItemId) {
      await cartApi.removeFromCart(item.cartItemId);
    }

    cartItems = cartItems.filter(
      ci => getItemKey(ci.id, ci.grainSize) !== getItemKey(id, grainSize)
    );
    saveLocalCart();
    emitChange();
  }, []);

  const updateQuantity = useCallback(async (id: string, quantity: number, grainSize?: string) => {
    const item = cartItems.find(
      ci => getItemKey(ci.id, ci.grainSize) === getItemKey(id, grainSize)
    );

    if (isSupabaseConfigured() && item?.cartItemId) {
      await cartApi.updateCartItemQuantity(item.cartItemId, quantity);
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter(
        ci => getItemKey(ci.id, ci.grainSize) !== getItemKey(id, grainSize)
      );
    } else {
      cartItems = cartItems.map(ci =>
        getItemKey(ci.id, ci.grainSize) === getItemKey(id, grainSize)
          ? { ...ci, quantity }
          : ci
      );
    }
    saveLocalCart();
    emitChange();
  }, []);

  const clearCart = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await cartApi.clearCart(userId);
    }

    cartItems = [];
    saveLocalCart();
    emitChange();
  }, [userId]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  };
}
