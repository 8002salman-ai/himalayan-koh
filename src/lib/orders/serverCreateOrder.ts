import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import {
  calculateOrderTotals,
  supportedCoupons,
  type CreateOrderData,
} from '@/lib/supabase/api/orders';
import type { CartWithItems, Json, Order, OrderItem, OrderWithItems } from '@/lib/supabase/database.types';
import { dispatchOrderCreatedNotifications } from '@/lib/orders/notifyOrderEvents';

async function isApprovedDealer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from('dealer_applications')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/**
 * Re-prices every cart line from the products table immediately before order
 * creation. Cart_items.unit_price is client-writable (see cartApi.addToCart)
 * and must never be trusted for money math — this is the single source of
 * truth for what a customer actually gets charged. Also rejects the order
 * outright if it contains a dealer_only product and the buyer isn't an
 * approved dealer, so retail checkout can't be used to acquire dealer-only
 * inventory even if it somehow ended up in a cart.
 */
function priceCartItems(cartItems: CartWithItems['cart_items'], isDealer: boolean) {
  return cartItems.map((item) => {
    const product = item.product;
    if (!product) {
      throw new Error('One of the items in your cart is no longer available. Please remove it and try again.');
    }
    if (product.dealer_only && !isDealer) {
      throw new Error('One of the items in your cart is restricted to approved dealer accounts.');
    }
    const unitPrice =
      isDealer && product.dealer_price != null ? Number(product.dealer_price) : Number(product.price);
    return { ...item, unitPrice };
  });
}

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

  const supabase = getSupabaseAdmin();
  const isDealer = await isApprovedDealer(supabase, options.userId ?? null);
  const pricedItems = priceCartItems(cart.cart_items, isDealer);

  const totals = calculateOrderTotals(
    pricedItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    {
      couponCode: data.couponCode,
      shippingMethod: data.shippingMethod,
      shippingCostOverride: data.shippingCostOverride,
    }
  );
  const normalizedCoupon = data.couponCode?.trim().toUpperCase();

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

  const orderItems = pricedItems.map((item) => ({
    order_id: (order as Order).id,
    product_id: item.product_id,
    product_name: item.product?.name || 'Unknown Product',
    product_image: item.product?.thumbnail || null,
    quantity: item.quantity,
    grain_size: item.grain_size,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
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

  dispatchOrderCreatedNotifications((order as Order).id);

  return {
    ...(order as Order),
    order_items: createdItems as OrderItem[],
  };
}
