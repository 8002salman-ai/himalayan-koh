import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/server/stripe';
import { markOrderPaid, markOrderPaymentFailed } from '@/lib/stripe/server/updateOrderPayment';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured.' }, { status: 503 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured on the server.' }, { status: 503 });
  }

  if (
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') &&
    process.env.STRIPE_ALLOW_LIVE !== 'true'
  ) {
    return NextResponse.json({ error: 'Live Stripe keys require STRIPE_ALLOW_LIVE=true.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header.' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    const message = error instanceof Error ? error.message : 'Invalid webhook payload.';
    return NextResponse.json({ error: message }, { status: 400 });
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler failed:', error);
    const message = error instanceof Error ? error.message : 'Webhook handler error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
