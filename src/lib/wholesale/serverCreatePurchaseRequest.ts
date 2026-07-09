import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import {
  isApprovedDealer,
  loadCartForCheckout,
  priceCartItems,
} from '@/lib/orders/serverCreateOrder';
import { calculateOrderTotals } from '@/lib/supabase/api/orders';
import type { Json, WholesalePurchaseRequest, WholesalePurchaseRequestItem } from '@/lib/supabase/database.types';
import { dispatchPurchaseRequestSubmittedNotifications } from '@/lib/wholesale/notifyPurchaseRequestEvents';
import { checkPurchaseRequestStock } from '@/lib/wholesale/checkPurchaseRequestStock';
import { issueProformaInvoice } from '@/lib/wholesale/issueInvoice';
import type { ShippingMethod } from '@/lib/supabase/api/orders';

export interface CreatePurchaseRequestData {
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: CreatePurchaseRequestData['shippingAddress'];
  dealerPoReference?: string;
  dealerNotes?: string;
  shippingMethod?: ShippingMethod;
  shippingCostOverride?: number;
}

export interface PurchaseRequestWithItems extends WholesalePurchaseRequest {
  wholesale_purchase_request_items: WholesalePurchaseRequestItem[];
}

/**
 * Creates a Purchase Request — NOT an order. Never touches `orders`,
 * `order_items`, or `inventory`. Reuses the same cart-loading and
 * server-side re-pricing logic as retail checkout (serverCreateOrder.ts) so
 * a dealer's request always reflects real dealer pricing, never a
 * client-supplied price. Only an approved dealer can reach this — verified
 * fresh from the database, never trusted from the caller.
 */
export async function serverCreatePurchaseRequest(
  data: CreatePurchaseRequestData,
  options: { userId: string }
): Promise<PurchaseRequestWithItems> {
  const supabase = getSupabaseAdmin();

  const isDealer = await isApprovedDealer(supabase, options.userId);
  if (!isDealer) {
    throw new Error('Only approved dealer accounts can submit a purchase request.');
  }

  const { data: dealerApplication, error: dealerAppError } = await supabase
    .from('dealer_applications')
    .select('id, business_email')
    .eq('user_id', options.userId)
    .eq('status', 'approved')
    .maybeSingle();
  if (dealerAppError) throw dealerAppError;
  if (!dealerApplication) {
    throw new Error('Approved dealer application not found.');
  }

  const cart = await loadCartForCheckout(options.userId, null);
  if (!cart || !cart.cart_items?.length) {
    throw new Error('Cart is empty. Add products again and retry.');
  }

  const pricedItems = priceCartItems(cart.cart_items, true);

  const totals = calculateOrderTotals(
    pricedItems.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
    {
      shippingMethod: data.shippingMethod,
      shippingCostOverride: data.shippingCostOverride,
    }
  );

  const { data: purchaseRequest, error: prError } = await supabase
    .from('wholesale_purchase_requests')
    .insert({
      dealer_id: options.userId,
      dealer_application_id: (dealerApplication as { id: string }).id,
      status: 'submitted',
      dealer_po_reference: data.dealerPoReference || null,
      subtotal: totals.subtotal,
      shipping_cost: totals.shippingCost,
      tax_amount: totals.taxAmount,
      total: totals.total,
      shipping_address: data.shippingAddress as unknown as Json,
      billing_address: (data.billingAddress || data.shippingAddress) as unknown as Json,
      dealer_notes: data.dealerNotes || null,
    } as never)
    .select()
    .single();

  if (prError) throw prError;

  const requestId = (purchaseRequest as WholesalePurchaseRequest).id;

  const items = pricedItems.map((item) => ({
    purchase_request_id: requestId,
    product_id: item.product_id,
    product_name: item.product?.name || 'Unknown Product',
    product_image: item.product?.thumbnail || null,
    moq_snapshot: item.product?.moq ?? 1,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_total: item.unitPrice * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('wholesale_purchase_request_items').insert(items as never);

  if (itemsError) throw itemsError;

  await supabase.from('wholesale_purchase_request_audit').insert({
    purchase_request_id: requestId,
    actor_id: options.userId,
    action: 'submitted',
    details: { itemCount: items.length, total: totals.total } as unknown as Json,
  } as never);

  await supabase.from('cart_items').delete().eq('cart_id', cart.id);

  // Automatic first-pass inventory check (business decision 2) — sets
  // status to ready_for_review/waiting_stock. Advisory only; does not
  // block submission and does not itself allow approval (see status.ts).
  await checkPurchaseRequestStock(requestId);

  // Issue Proforma Invoice v1 immediately so the submission emails below
  // have a real, permanent PDF to attach — not a promise of one.
  await issueProformaInvoice(requestId, null);

  dispatchPurchaseRequestSubmittedNotifications(requestId);

  const { data: finalRequest, error: finalError } = await supabase
    .from('wholesale_purchase_requests')
    .select('*, wholesale_purchase_request_items(*)')
    .eq('id', requestId)
    .single();
  if (finalError) throw finalError;

  return finalRequest as PurchaseRequestWithItems;
}
