import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { dispatchOrderShippedNotifications } from '@/lib/orders/notifyOrderEvents';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import type { Database } from '@/lib/supabase/database.types';

type OrderStatus = Database['public']['Tables']['orders']['Row']['status'];
type PaymentStatus = Database['public']['Tables']['orders']['Row']['payment_status'];

const orderStatuses: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const orderId = typeof record.orderId === 'string' ? record.orderId.trim() : '';
  const status = typeof record.status === 'string' ? record.status.trim() : '';
  const paymentStatus =
    typeof record.paymentStatus === 'string' ? record.paymentStatus.trim() : undefined;
  const trackingNumber =
    typeof record.trackingNumber === 'string' ? record.trackingNumber.trim() : undefined;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
  }
  if (!orderStatuses.includes(status as OrderStatus)) {
    return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 });
  }
  if (paymentStatus && !paymentStatuses.includes(paymentStatus as PaymentStatus)) {
    return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_status, tracking_number')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const prev = existing as {
      status: OrderStatus;
      payment_status: PaymentStatus;
      tracking_number: string | null;
    };

    const updates: Record<string, string | null> = {
      status: status as OrderStatus,
      updated_at: new Date().toISOString(),
    };

    if (trackingNumber !== undefined) {
      updates.tracking_number = trackingNumber || null;
    }

    if (status === 'shipped') {
      updates.shipped_at = new Date().toISOString();
    }
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updates as never)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    if (paymentStatus) {
      const { error: paymentError } = await supabase
        .from('orders')
        .update({
          payment_status: paymentStatus as PaymentStatus,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', orderId);

      if (paymentError) throw paymentError;
    }

    const nextTracking = trackingNumber ?? prev.tracking_number;
    const becameShipped = prev.status !== 'shipped' && status === 'shipped' && Boolean(nextTracking);

    if (becameShipped) {
      dispatchOrderShippedNotifications(orderId);
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    console.error('Admin order status update failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to update order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
