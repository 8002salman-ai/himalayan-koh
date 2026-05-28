import { supabase } from '../client';
import type { Order, OrderItem, OrderWithItems, Json } from '../database.types';
import { cartApi } from './cart';

export const TAX_RATE = 0.0825;
export const FREE_SHIPPING_THRESHOLD = 50;
export const STANDARD_SHIPPING_COST = 9.95;
export const EXPEDITED_SHIPPING_COST = 18.95;

export type ShippingMethod = 'standard' | 'expedited';

export const supportedCoupons: Record<string, { label: string; percentage: number }> = {
  HKWELCOME10: { label: '10% welcome discount', percentage: 0.1 },
};

export interface OrderTotals {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface TotalsLineItem {
  quantity: number;
  unitPrice: number;
}

export interface CalculateOrderOptions {
  couponCode?: string;
  shippingMethod?: ShippingMethod;
  /** Live Shippo rate amount — overrides flat-rate shipping when set. */
  shippingCostOverride?: number;
}

export function calculateOrderTotals(items: TotalsLineItem[], options: CalculateOrderOptions = {}): OrderTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const normalizedCoupon = options.couponCode?.trim().toUpperCase() || '';
  const coupon = supportedCoupons[normalizedCoupon];
  const discountAmount = coupon ? subtotal * coupon.percentage : 0;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingMethod = options.shippingMethod || 'standard';
  const shippingCost =
    typeof options.shippingCostOverride === 'number' && options.shippingCostOverride >= 0
      ? options.shippingCostOverride
      : shippingMethod === 'expedited'
        ? EXPEDITED_SHIPPING_COST
        : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : STANDARD_SHIPPING_COST;
  const taxAmount = taxableSubtotal * TAX_RATE;
  const total = taxableSubtotal + shippingCost + taxAmount;

  return { subtotal, shippingCost, discountAmount, taxAmount, total };
}

export interface CreateOrderData {
  email: string;
  phone?: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
  paymentProvider?: 'invoice' | 'stripe';
  paymentIntentId?: string;
  paymentStatus?: Order['payment_status'];
  couponCode?: string;
  shippingMethod?: ShippingMethod;
  shippingCostOverride?: number;
  shippoRateId?: string;
  shippingCarrier?: string;
  shippingService?: string;
  notes?: string;
  /** Clear cart after order insert (default true). Stripe checkout clears after payment succeeds. */
  clearCart?: boolean;
}

export interface OrderFilters {
  status?: Order['status'];
  paymentStatus?: Order['payment_status'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const ordersApi = {
  // Create a new order from cart
  async createOrder(data: CreateOrderData, userId?: string): Promise<OrderWithItems> {
    const cart = await cartApi.getCartWithItems(userId);

    if (!cart || cart.cart_items.length === 0) {
      throw new Error('Cart is empty');
    }

    const totals = calculateOrderTotals(
      cart.cart_items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
      {
        couponCode: data.couponCode,
        shippingMethod: data.shippingMethod,
        shippingCostOverride: data.shippingCostOverride,
      }
    );
    const normalizedCoupon = data.couponCode?.trim().toUpperCase();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        email: data.email,
        phone: data.phone || null,
        status: 'pending',
        payment_status: data.paymentStatus || 'pending',
        subtotal: totals.subtotal,
        shipping_cost: totals.shippingCost,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        total: totals.total,
        shipping_address: data.shippingAddress as unknown as Json,
        billing_address: {
          ...(data.billingAddress || data.shippingAddress),
          shippingMethod: data.shippingMethod || 'standard',
          shippoRateId: data.shippoRateId || null,
          shippingCarrier: data.shippingCarrier || null,
          shippingService: data.shippingService || null,
        } as unknown as Json,
        shippo_rate_id: data.shippoRateId || null,
        shipping_carrier: data.shippingCarrier || null,
        shipping_service: data.shippingService || null,
        payment_method: data.paymentMethod || data.paymentProvider || null,
        notes: [
          data.notes,
          normalizedCoupon && supportedCoupons[normalizedCoupon] ? `Coupon: ${normalizedCoupon}` : null,
          data.paymentIntentId ? `Stripe payment intent: ${data.paymentIntentId}` : null,
        ].filter(Boolean).join('\n') || null,
      } as never)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = cart.cart_items.map((item) => ({
      order_id: (order as Order).id,
      product_id: item.product_id,
      product_name: item.product?.name || 'Unknown Product',
      product_image: item.product?.thumbnail || null,
      quantity: item.quantity,
      grain_size: item.grain_size,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems as never)
      .select();

    if (itemsError) throw itemsError;

    if (data.clearCart !== false) {
      await cartApi.clearCart(userId);
    }

    return {
      ...(order as Order),
      order_items: createdItems as OrderItem[],
    };
  },

  // Get user's orders
  async getUserOrders(userId: string, filters: OrderFilters = {}): Promise<{ orders: OrderWithItems[]; count: number }> {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { orders: data as OrderWithItems[], count: count || 0 };
  },

  // Get single order by ID
  async getOrderById(orderId: string, userId?: string): Promise<OrderWithItems | null> {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as OrderWithItems;
  },

  // Get order by order number
  async getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as OrderWithItems;
  },

  // Cancel order (user can only cancel pending orders)
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.getOrderById(orderId, userId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Only pending orders can be cancelled');
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' } as never)
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },
};
