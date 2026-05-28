import { parseJsonBody, rejectMethod } from './_lib/request.js';
import { getStripeClient, assertStripeConfigured } from './_lib/stripeClient.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { markOrderPaid } from './_lib/updateOrderPayment.js';
import { validateVerifyPaymentBody } from './_lib/validation.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return rejectMethod(request, response, ['POST']);
  }

  if (!assertStripeConfigured(response)) return;

  let body;
  try {
    body = await parseJsonBody(request);
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body' });
  }

  const validated = validateVerifyPaymentBody(body);
  if (!validated.ok) {
    return response.status(validated.status).json({ error: validated.error });
  }

  const { orderId, paymentIntentId } = validated.data;

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
