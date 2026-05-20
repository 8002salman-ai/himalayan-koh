import { getStripeClient, assertStripeConfigured } from './_lib/stripeClient.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { markOrderPaid } from './_lib/updateOrderPayment.js';

/**
 * After client-side confirmPayment, verify PI with Stripe and mark order paid (service role).
 *
 * @param {import('http').IncomingMessage} request
 * @param {import('http').ServerResponse} response
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!assertStripeConfigured(response)) return;

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body' });
  }

  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  const paymentIntentId =
    typeof body?.paymentIntentId === 'string' ? body.paymentIntentId.trim() : '';

  if (!orderId || !paymentIntentId) {
    return response.status(400).json({ error: 'orderId and paymentIntentId are required.' });
  }

  try {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return response.status(402).json({
        error: 'Payment has not completed yet. Please try again or use a different card.',
        status: paymentIntent.status,
      });
    }

    const metadataOrderId = paymentIntent.metadata?.order_id;
    if (metadataOrderId && metadataOrderId !== orderId) {
      return response.status(400).json({ error: 'Payment does not match this order.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return response.status(404).json({ error: 'Order not found.' });
    }

    const expectedCents = Math.round(Number(order.total) * 100);
    if (paymentIntent.amount !== expectedCents) {
      return response.status(400).json({ error: 'Payment amount does not match order total.' });
    }

    const result = await markOrderPaid(orderId, paymentIntentId);

    return response.status(200).json({
      ok: true,
      orderId,
      paymentIntentId,
      paymentStatus: 'paid',
      alreadyPaid: result.alreadyPaid,
    });
  } catch (error) {
    console.error('Stripe payment verification failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to verify payment.';
    return response.status(502).json({ error: message });
  }
}
