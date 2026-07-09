import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

/**
 * Automatic first-pass inventory check (business decision 2). Compares
 * each line's quantity against `inventory`, writes the result onto each
 * item, and sets the request's status to 'ready_for_review' or
 * 'waiting_stock' accordingly. This is purely informational/advisory — it
 * never blocks or allows a purchase; an admin still has to explicitly
 * verify stock (a separate, later action — see status.ts) before the
 * request can be approved. A line an admin has already marked
 * stock_verified is always treated as available, regardless of what the
 * inventory table says, so a manual override always takes effect on
 * re-run.
 */
export async function checkPurchaseRequestStock(
  requestId: string
): Promise<'ready_for_review' | 'waiting_stock'> {
  const supabase = getSupabaseAdmin();

  const { data: itemRows, error: itemsError } = await supabase
    .from('wholesale_purchase_request_items')
    .select('id, product_id, quantity, admin_adjusted_quantity, stock_verified')
    .eq('purchase_request_id', requestId);
  if (itemsError) throw itemsError;

  const items = (itemRows ||
    []) as { id: string; product_id: string; quantity: number; admin_adjusted_quantity: number | null; stock_verified: boolean }[];
  if (items.length === 0) return 'waiting_stock';

  const productIds = [...new Set(items.map((i) => i.product_id))];
  const { data: invRows, error: invError } = await supabase
    .from('inventory')
    .select('product_id, quantity, reserved_quantity, track_inventory, allow_backorder')
    .in('product_id', productIds);
  if (invError) throw invError;

  const inventoryByProduct = new Map(
    ((invRows || []) as {
      product_id: string;
      quantity: number;
      reserved_quantity: number;
      track_inventory: boolean;
      allow_backorder: boolean;
    }[]).map((row) => [row.product_id, row])
  );

  let anyInsufficient = false;

  for (const item of items) {
    const inv = inventoryByProduct.get(item.product_id);
    const requiredQty = item.admin_adjusted_quantity ?? item.quantity;
    const availableQty = inv ? inv.quantity - inv.reserved_quantity : 0;

    const available =
      item.stock_verified ||
      (inv ? (inv.track_inventory === false || inv.allow_backorder === true || availableQty >= requiredQty) : false);

    if (!available) anyInsufficient = true;

    const { error: updateError } = await supabase
      .from('wholesale_purchase_request_items')
      .update({
        auto_stock_check: available ? 'available' : 'insufficient',
        auto_stock_available_qty: inv ? availableQty : 0,
      } as never)
      .eq('id', item.id);
    if (updateError) throw updateError;
  }

  const nextStatus: 'ready_for_review' | 'waiting_stock' = anyInsufficient ? 'waiting_stock' : 'ready_for_review';

  const { error: statusError } = await supabase
    .from('wholesale_purchase_requests')
    .update({ status: nextStatus } as never)
    .eq('id', requestId)
    .in('status', ['submitted', 'ready_for_review', 'waiting_stock']);
  if (statusError) throw statusError;

  return nextStatus;
}
