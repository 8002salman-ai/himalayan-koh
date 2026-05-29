import { getSupabaseAdmin } from './supabaseAdmin';
import { dispatchPaymentReceivedNotifications } from '@/lib/orders/notifyOrderEvents';

export async function markOrderPaid(orderId: string, paymentIntentId: string) {
  const supabase = getSupabaseAdmin();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, payment_status, notes')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) throw new Error('Order not found');

  const current = order as { payment_status: string; notes: string | null };
  if (current.payment_status === 'paid') {
    return { alreadyPaid: true };
  }

  const stripeNote = `Stripe payment intent: ${paymentIntentId}`;
  const notes = current.notes
    ? current.notes.includes(paymentIntentId)
      ? current.notes
      : `${current.notes}\n${stripeNote}`
    : stripeNote;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: 'stripe_card',
      status: 'processing',
      notes,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId);

  if (updateError) throw updateError;
  dispatchPaymentReceivedNotifications(orderId);
  return { alreadyPaid: false };
}

export async function markOrderPaymentFailed(orderId: string) {
  const supabase = getSupabaseAdmin();

  const { data: order } = await supabase
    .from('orders')
    .select('payment_status')
    .eq('id', orderId)
    .maybeSingle();

  const row = order as { payment_status: string } | null;
  if (!row || row.payment_status === 'paid') return;

  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      payment_method: 'stripe_card',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId);
}
