import { supabase } from '../client';
import type { Order, OrderWithItems, Json } from '../database.types';
import { cartApi } from './cart';

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
  notes?: string;
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
  async createOrder(data: CreateOrderData, userId?: string): Promise<Order> {
    const cart = await cartApi.getCartWithItems(userId);

    if (!cart || cart.cart_items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate totals
    const subtotal = cart.cart_items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const shippingCost = subtotal >= 50 ? 0 : 9.95; // Free shipping over $50
    const taxRate = 0.0825; // Texas tax rate
    const taxAmount = subtotal * taxRate;
    const total = subtotal + shippingCost + taxAmount;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        email: data.email,
        phone: data.phone || null,
        subtotal,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        total,
        shipping_address: data.shippingAddress as unknown as Json,
        billing_address: (data.billingAddress || data.shippingAddress) as unknown as Json,
        payment_method: data.paymentMethod || null,
        notes: data.notes || null,
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

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems as never);

    if (itemsError) throw itemsError;

    // Clear the cart
    await cartApi.clearCart(userId);

    return order as Order;
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
