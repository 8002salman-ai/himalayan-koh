import { useCallback, useSyncExternalStore } from 'react';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  grainSize?: string;
}

let cartItems: CartItem[] = [];
let listeners: Set<() => void> = new Set();

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

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const existing = cartItems.find(
      ci => ci.id === item.id && ci.grainSize === item.grainSize
    );
    if (existing) {
      existing.quantity += quantity;
      cartItems = [...cartItems];
    } else {
      cartItems = [...cartItems, { ...item, quantity }];
    }
    emitChange();
  }, []);

  const removeItem = useCallback((id: number, grainSize?: string) => {
    cartItems = cartItems.filter(
      ci => !(ci.id === id && ci.grainSize === grainSize)
    );
    emitChange();
  }, []);

  const updateQuantity = useCallback((id: number, quantity: number, grainSize?: string) => {
    if (quantity <= 0) {
      cartItems = cartItems.filter(
        ci => !(ci.id === id && ci.grainSize === grainSize)
      );
    } else {
      cartItems = cartItems.map(ci =>
        ci.id === id && ci.grainSize === grainSize
          ? { ...ci, quantity }
          : ci
      );
    }
    emitChange();
  }, []);

  const clearCart = useCallback(() => {
    cartItems = [];
    emitChange();
  }, []);

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
