import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { dispatchOrderCreatedNotifications } from '@/lib/orders/notifyOrderEvents';
import { dispatchPurchaseRequestConvertedNotifications } from '@/lib/wholesale/notifyPurchaseRequestEvents';
import type {
  Json,
  Order,
  WholesalePurchaseRequest,
  WholesalePurchaseRequestItem,
} from '@/lib/supabase/database.types';

/**
 * Converts a Purchase Request into a real Order. This is the ONLY place in
 * the wholesale workflow that creates an `orders` row or touches
 * `inventory` — enforced by requiring status === 'paid' (i.e. stock already
 * approved AND payment already confirmed) before doing anything. No
 * exceptions: a request that is merely 'approved' cannot be converted.
 */
export async function serverConvertPurchaseRequest(
  purchaseRequestId: string,
  adminId: string
): Promise<Order> {
  const supabase = getSupabaseAdmin();

  const { data: pr, error: prError } = await supabase
    .from('wholesale_purchase_requests')
    .select('*')
    .eq('id', purchaseRequestId)
    .maybeSingle();
  if (prError) throw prError;
  if (!pr) throw new Error('Purchase request not found.');

  const request = pr as WholesalePurchaseRequest;
  if (request.status !== 'paid') {
    throw new Error('Only a purchase request with status "paid" (stock approved and payment confirmed) can be converted into an order.');
  }
  if (request.converted_order_id) {
    throw new Error('This purchase request has already been converted to an order.');
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from('wholesale_purchase_request_items')
    .select('*')
    .eq('purchase_request_id', purchaseRequestId);
  if (itemsError) throw itemsError;

  const items = (itemRows as WholesalePurchaseRequestItem[]) || [];
  if (items.length === 0) {
    throw new Error('Purchase request has no line items.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', request.dealer_id)
    .maybeSingle();
  if (profileError) throw profileError;
  const email = (profile as { email?: string } | null)?.email;
  if (!email) throw new Error('Dealer account has no email on file.');

  const effectiveItems = items.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    product_image: item.product_image,
    quantity: item.admin_adjusted_quantity ?? item.quantity,
    unitPrice: item.admin_adjusted_unit_price ?? item.unit_price,
  }));

  // 1. Create the real order — already stock-approved and paid, so it enters
  // the normal fulfillment lifecycle at 'processing', not 'pending'.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: request.dealer_id,
      email,
      status: 'processing',
      payment_status: 'paid',
      payment_method: request.payment_method || 'wholesale_bank_transfer',
      subtotal: request.subtotal,
      shipping_cost: request.shipping_cost,
      tax_amount: request.tax_amount,
      discount_amount: 0,
      total: request.total,
      shipping_address: request.shipping_address,
      billing_address: (request.billing_address || request.shipping_address) as Json,
      notes: `Wholesale order — converted from purchase request ${request.request_number}`,
    } as never)
    .select()
    .single();
  if (orderError) throw orderError;

  const createdOrder = order as Order;

  // 2. Create order items from the request's effective (possibly
  // admin-adjusted) quantities/prices.
  const orderItems = effectiveItems.map((item) => ({
    order_id: createdOrder.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_image: item.product_image,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
  }));

  const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems as never);
  if (orderItemsError) throw orderItemsError;

  // 3. Reduce inventory — only now, only for this converted order. Retail's
  // inventory behavior (never decremented anywhere) is untouched by this.
  for (const item of effectiveItems) {
    const { data: inv, error: invError } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', item.product_id)
      .maybeSingle();
    if (invError) throw invError;
    if (!inv) continue;

    const current = (inv as { id: string; quantity: number }).quantity;
    const nextQuantity = current - item.quantity;
    if (nextQuantity < 0) {
      throw new Error(
        `Insufficient inventory for a converted line item — available ${current}, required ${item.quantity}. Fix stock before converting.`
      );
    }

    const { error: decrementError } = await supabase
      .from('inventory')
      .update({ quantity: nextQuantity } as never)
      .eq('id', (inv as { id: string }).id);
    if (decrementError) throw decrementError;
  }

  // 4. Link the request to the order it became.
  const { error: updateError } = await supabase
    .from('wholesale_purchase_requests')
    .update({
      status: 'converted',
      converted_order_id: createdOrder.id,
      converted_at: new Date().toISOString(),
    } as never)
    .eq('id', purchaseRequestId);
  if (updateError) throw updateError;

  await supabase.from('wholesale_purchase_request_audit').insert({
    purchase_request_id: purchaseRequestId,
    actor_id: adminId,
    action: 'converted_to_order',
    details: { orderId: createdOrder.id, orderNumber: createdOrder.order_number } as unknown as Json,
  } as never);

  dispatchOrderCreatedNotifications(createdOrder.id);
  dispatchPurchaseRequestConvertedNotifications(purchaseRequestId, createdOrder.order_number);

  return createdOrder;
}
