import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { dispatchOrderCreatedNotifications } from '@/lib/orders/notifyOrderEvents';
import { dispatchPurchaseRequestConvertedNotifications } from '@/lib/wholesale/notifyPurchaseRequestEvents';
import { issueCommercialInvoice } from '@/lib/wholesale/issueInvoice';
import type { Order } from '@/lib/supabase/database.types';

/**
 * Converts a Purchase Request into a real Order via
 * convert_wholesale_purchase_request() (see migration 021) — a single
 * Postgres function call, and therefore a single transaction: create
 * order, create order items, reserve inventory, reduce inventory, update
 * the purchase request, and write the audit log either all commit
 * together or all roll back together. No partial state is possible, even
 * if an inventory check fails partway through a multi-line request.
 */
export async function serverConvertPurchaseRequest(
  purchaseRequestId: string,
  adminId: string
): Promise<Order> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('convert_wholesale_purchase_request', {
    p_request_id: purchaseRequestId,
    p_admin_id: adminId,
  } as never);
  if (error) throw new Error(error.message);

  const order = data as Order;

  // Official Tax/Commercial Invoice — issued once, immutably, right after
  // conversion. A second conversion attempt can never reach this line
  // (the RPC itself refuses to convert an already-converted request), so
  // this can never silently create a duplicate commercial invoice either.
  await issueCommercialInvoice(purchaseRequestId, adminId);

  dispatchOrderCreatedNotifications(order.id);
  dispatchPurchaseRequestConvertedNotifications(purchaseRequestId, order.order_number);

  return order;
}
