import { getSupabaseAdmin } from './supabaseAdmin.js';

/**
 * Mark order paid after Stripe confirms payment (verify API or webhook).
 * @param {string} orderId
 * @param {string} paymentIntentId
 */
export async function markOrderPaid(orderId, paymentIntentId) {
  const supabase = getSupabaseAdmin();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, payment_status, notes')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!order) throw new Error('Order not found');

  if (order.payment_status === 'paid') {
    return { alreadyPaid: true };
  }

  const stripeNote = `Stripe payment intent: ${paymentIntentId}`;
  const notes = order.notes
    ? order.notes.includes(paymentIntentId)
      ? order.notes
      : `${order.notes}\n${stripeNote}`
    : stripeNote;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: 'stripe_card',
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) throw updateError;
  return { alreadyPaid: false };
}

/**
 * @param {string} orderId
 */
export async function markOrderPaymentFailed(orderId) {
  const supabase = getSupabaseAdmin();

  const { data: order } = await supabase
    .from('orders')
    .select('payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_status === 'paid') return;

  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      payment_method: 'stripe_card',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}
