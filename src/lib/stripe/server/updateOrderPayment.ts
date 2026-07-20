import { getSupabaseAdmin } from './supabaseAdmin';
import { dispatchPaymentReceivedNotifications } from '@/lib/orders/notifyOrderEvents';

/**
 * Map a Stripe PaymentIntent's payment_method_types[] to the label we persist on
 * the order. Cards stay 'stripe_card' (unchanged); BNPL and other methods get a
 * descriptive label so admins/emails don't mislabel a Klarna order as a card.
 */
export function resolveStripePaymentMethodLabel(paymentMethodTypes?: string[] | null): string {
  const types = paymentMethodTypes || [];
  if (types.includes('klarna')) return 'stripe_klarna';
  if (types.includes('afterpay_clearpay')) return 'stripe_afterpay_clearpay';
  if (types.includes('affirm')) return 'stripe_affirm';
  const primary = types.find((t) => t && t !== 'card');
  if (primary) return `stripe_${primary}`;
  return 'stripe_card';
}

export async function markOrderPaid(
  orderId: string,
  paymentIntentId: string,
  paymentMethodLabel: string = 'stripe_card'
) {
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
      payment_method: paymentMethodLabel,
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
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId);
}
