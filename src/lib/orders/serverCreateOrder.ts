import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import {
  calculateOrderTotals,
  supportedCoupons,
  type CreateOrderData,
} from '@/lib/supabase/api/orders';
import type { CartWithItems, Json, Order, OrderItem, OrderWithItems } from '@/lib/supabase/database.types';

async function loadCartForCheckout(
  userId: string | null,
  cartSessionId: string | null
): Promise<CartWithItems | null> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from('carts').select(`
    *,
    cart_items(
      *,
      product:products(*)
    )
  `);

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (cartSessionId) {
    query = query.eq('session_id', cartSessionId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as CartWithItems | null;
}

export async function serverCreateOrder(
  data: CreateOrderData,
  options: { userId?: string | null; cartSessionId?: string | null }
): Promise<OrderWithItems> {
  const cart = await loadCartForCheckout(options.userId ?? null, options.cartSessionId ?? null);

  if (!cart || !cart.cart_items?.length) {
    throw new Error('Cart is empty. Add products again and retry checkout.');
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
  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: options.userId || null,
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
      ]
        .filter(Boolean)
        .join('\n') || null,
    } as never)
    .select()
    .single();

  if (orderError) throw orderError;

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
    const { error: clearError } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);
    if (clearError) throw clearError;
  }

  return {
    ...(order as Order),
    order_items: createdItems as OrderItem[],
  };
}
