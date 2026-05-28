import Stripe from 'stripe';
import { getStripeClient } from './_lib/stripeClient.js';
import { markOrderPaid, markOrderPaymentFailed } from './_lib/updateOrderPayment.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * @param {import('http').IncomingMessage} readable
 * @returns {Promise<Buffer>}
 */
async function readRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * @param {import('http').IncomingMessage} request
 * @param {import('http').ServerResponse} response
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return response.status(503).json({
      error: 'STRIPE_WEBHOOK_SECRET is not configured.',
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response.status(503).json({ error: 'STRIPE_SECRET_KEY is not configured on the server.' });
  }
  if (
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') &&
    process.env.STRIPE_ALLOW_LIVE !== 'true'
  ) {
    return response.status(503).json({ error: 'Live Stripe keys require STRIPE_ALLOW_LIVE=true.' });
  }

  const signature = request.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) {
    return response.status(400).json({ error: 'Missing Stripe-Signature header.' });
  }

  let event;
  try {
    const stripe = getStripeClient();
    const rawBody = await readRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    const message = error instanceof Error ? error.message : 'Invalid webhook payload.';
    return response.status(400).json({ error: message });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.order_id;
      if (orderId) {
        await markOrderPaid(orderId, paymentIntent.id);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.order_id;
      if (orderId) {
        await markOrderPaymentFailed(orderId);
      }
    }

    return response.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler failed:', error);
    const message = error instanceof Error ? error.message : 'Webhook handler error.';
    return response.status(500).json({ error: message });
  }
}
