import { NextResponse } from 'next/server';
import { getStripeClient, resolveStripeWebhookSecret } from '@/lib/stripe/server/stripe';
import { markOrderPaymentFailed, resolveStripePaymentMethodLabel } from '@/lib/stripe/server/updateOrderPayment';
import { getCheckoutSession, finalizeCheckoutSession, shouldFinalizeSuccessfulPayment } from '@/lib/stripe/server/checkoutSessions';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const webhookSecret = await resolveStripeWebhookSecret();
  if (!webhookSecret) return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe-Signature header.' }, { status: 400 });

  const rawBody = await request.text();
  let event;
  try {
    const stripe = await getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  try {
    const paymentIntent = event.data.object as any;
    const sessionId = paymentIntent.metadata?.checkout_session_id;
    if (shouldFinalizeSuccessfulPayment(event.type) && sessionId) {
      await finalizeCheckoutSession(sessionId, paymentIntent.id, resolveStripePaymentMethodLabel(paymentIntent.payment_method_types));
    }
    if (event.type === 'payment_intent.payment_failed' && sessionId) {
      const session = await getCheckoutSession(sessionId);
      if (session?.orderId) await markOrderPaymentFailed(session.orderId);
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook handler error.' }, { status: 500 });
  }
}
