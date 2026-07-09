import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { TAX_RATE } from '@/lib/supabase/api/orders';
import { allowedNextStatuses, canVerifyStock } from '@/lib/wholesale/status';
import { dispatchPurchaseRequestStatusChangedNotifications } from '@/lib/wholesale/notifyPurchaseRequestEvents';
import type { Json, WholesalePurchaseRequest, WholesalePurchaseRequestItem } from '@/lib/supabase/database.types';

const VALID_PAYMENT_METHODS = ['bank_transfer', 'cash'];

interface ReviewBody {
  status?: WholesalePurchaseRequest['status'];
  reason?: string;
  changeNote?: string;
  expectedDispatchDate?: string;
  paymentMethod?: string;
  items?: Array<{
    itemId: string;
    stockVerified?: boolean;
    adjustedQuantity?: number;
    adjustedUnitPrice?: number;
  }>;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: requestId } = await params;

  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('wholesale_purchase_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Purchase request not found.' }, { status: 404 });
    }
    const current = existing as WholesalePurchaseRequest;

    if (body.status && !allowedNextStatuses(current.status).includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot move purchase request from "${current.status}" to "${body.status}".` },
        { status: 400 }
      );
    }

    // Business decision 1: wholesale payment is bank transfer or cash
    // only — reject anything else outright, regardless of what the UI
    // sends. This is the authoritative enforcement point; the UI select
    // is a convenience, not the boundary.
    if (body.paymentMethod && !VALID_PAYMENT_METHODS.includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method "${body.paymentMethod}" — must be "bank_transfer" or "cash".` },
        { status: 400 }
      );
    }

    // Business decision 3: approval is only ever reachable from
    // 'stock_verified' — allowedNextStatuses() above already guarantees
    // this structurally (there is no other case that lists 'approved'),
    // but this is a second, explicit check on the exact same rule so a
    // future edit to the status graph can't silently reopen the gap.
    if (body.status === 'approved' && current.status !== 'stock_verified') {
      return NextResponse.json(
        { error: 'Approval is only possible after stock verification is complete.' },
        { status: 400 }
      );
    }

    // 1. Apply per-item stock-check / quantity / price adjustments, if any.
    if (body.items?.length) {
      for (const item of body.items) {
        const update: Record<string, unknown> = {};
        if (typeof item.stockVerified === 'boolean') update.stock_verified = item.stockVerified;
        if (typeof item.adjustedQuantity === 'number') update.admin_adjusted_quantity = item.adjustedQuantity;
        if (typeof item.adjustedUnitPrice === 'number') update.admin_adjusted_unit_price = item.adjustedUnitPrice;
        if (Object.keys(update).length === 0) continue;

        const { data: itemRow, error: itemFetchError } = await supabase
          .from('wholesale_purchase_request_items')
          .select('*')
          .eq('id', item.itemId)
          .eq('purchase_request_id', requestId)
          .maybeSingle();
        if (itemFetchError) throw itemFetchError;
        if (!itemRow) continue;

        const row = itemRow as WholesalePurchaseRequestItem;
        const effectiveQuantity = (update.admin_adjusted_quantity as number | undefined) ?? row.admin_adjusted_quantity ?? row.quantity;
        const effectivePrice = (update.admin_adjusted_unit_price as number | undefined) ?? row.admin_adjusted_unit_price ?? row.unit_price;
        update.line_total = effectiveQuantity * effectivePrice;

        const { error: itemUpdateError } = await supabase
          .from('wholesale_purchase_request_items')
          .update(update as never)
          .eq('id', item.itemId);
        if (itemUpdateError) throw itemUpdateError;
      }

      const { data: allItems, error: allItemsError } = await supabase
        .from('wholesale_purchase_request_items')
        .select('line_total')
        .eq('purchase_request_id', requestId);
      if (allItemsError) throw allItemsError;

      const subtotal = ((allItems as { line_total: number }[]) || []).reduce((sum, i) => sum + Number(i.line_total), 0);
      const taxAmount = subtotal * TAX_RATE;
      const total = subtotal + taxAmount + Number(current.shipping_cost);

      const { error: totalsUpdateError } = await supabase
        .from('wholesale_purchase_requests')
        .update({ subtotal, tax_amount: taxAmount, total } as never)
        .eq('id', requestId);
      if (totalsUpdateError) throw totalsUpdateError;
    }

    // Business decision 3 (continued): every line must be either
    // auto-available or explicitly overridden by this admin before the
    // request can move to 'stock_verified' — using the freshest item
    // state, i.e. after the edits applied just above.
    if (body.status === 'stock_verified') {
      const { data: currentItems, error: currentItemsError } = await supabase
        .from('wholesale_purchase_request_items')
        .select('auto_stock_check, stock_verified')
        .eq('purchase_request_id', requestId);
      if (currentItemsError) throw currentItemsError;

      if (!canVerifyStock((currentItems as { auto_stock_check: string | null; stock_verified: boolean }[]) || [])) {
        return NextResponse.json(
          { error: 'Every line must be in stock or explicitly overridden before stock can be verified.' },
          { status: 400 }
        );
      }
    }

    // 2. Apply dispatch date / payment method updates.
    const directUpdate: Record<string, unknown> = {};
    if (body.expectedDispatchDate) directUpdate.expected_dispatch_date = body.expectedDispatchDate;
    if (body.paymentMethod) directUpdate.payment_method = body.paymentMethod;

    // 3. Apply status transition.
    if (body.status) {
      directUpdate.status = body.status;
      directUpdate.reviewed_by = auth.userId;
      directUpdate.reviewed_at = new Date().toISOString();
      if (body.status === 'rejected') directUpdate.rejection_reason = body.reason || null;
      if (body.status === 'changes_requested') directUpdate.change_request_note = body.changeNote || null;
      if (body.status === 'paid') directUpdate.payment_confirmed_at = new Date().toISOString();
    }

    if (Object.keys(directUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from('wholesale_purchase_requests')
        .update(directUpdate as never)
        .eq('id', requestId);
      if (updateError) throw updateError;
    }

    const auditAction = body.status
      ? `status_changed_to_${body.status}`
      : body.items?.length
        ? 'items_updated'
        : body.expectedDispatchDate
          ? 'dispatch_date_set'
          : 'reviewed';

    await supabase.from('wholesale_purchase_request_audit').insert({
      purchase_request_id: requestId,
      actor_id: auth.userId,
      action: auditAction,
      details: (body.reason || body.changeNote ? { reason: body.reason, changeNote: body.changeNote } : null) as Json | null,
    } as never);

    if (body.status) {
      dispatchPurchaseRequestStatusChangedNotifications(requestId, body.reason || body.changeNote);
    }

    const { data: updatedRequest, error: reloadError } = await supabase
      .from('wholesale_purchase_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (reloadError) throw reloadError;

    const { data: updatedItems, error: reloadItemsError } = await supabase
      .from('wholesale_purchase_request_items')
      .select('*')
      .eq('purchase_request_id', requestId);
    if (reloadItemsError) throw reloadItemsError;

    return NextResponse.json({ request: updatedRequest, items: updatedItems });
  } catch (error) {
    console.error('Purchase request review failed:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to update purchase request.') }, { status: 500 });
  }
}
