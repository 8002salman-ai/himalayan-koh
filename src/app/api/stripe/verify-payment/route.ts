import { NextResponse } from 'next/server';
import { getStripeClient, stripeConfigError } from '@/lib/stripe/server/stripe';
import { validateVerifyPaymentBody } from '@/lib/stripe/server/validation';
import { getCheckoutSession } from '@/lib/stripe/server/checkoutSessions';

export async function POST(request: Request) {
  const configError = await stripeConfigError();
  if (configError) return configError;
  const body = await request.json().catch(() => null);
  const validated = validateVerifyPaymentBody(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: validated.status });

  try {
    const stripe = await getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(validated.data.paymentIntentId);
    const sessionId = paymentIntent.metadata?.checkout_session_id;
    if (!sessionId) return NextResponse.json({ error: 'Payment is not linked to a checkout session.' }, { status: 400 });
    const session = await getCheckoutSession(sessionId);
    if (!session || session.paymentIntentId !== paymentIntent.id) {
      return NextResponse.json({ error: 'Payment does not match this checkout session.' }, { status: 400 });
    }

    if (paymentIntent.status === 'processing' || paymentIntent.status === 'requires_action') {
      return NextResponse.json({ ok: true, paymentIntentId: paymentIntent.id, checkoutSessionId: sessionId, paymentStatus: 'pending', pending: true, status: paymentIntent.status });
    }
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment has not completed yet. Please try again or use a different card.', status: paymentIntent.status }, { status: 402 });
    }

    // The webhook is the only order-creation path. A successful card response
    // merely tells the client whether the signed webhook has already finalized it.
    return NextResponse.json({
      ok: true,
      paymentIntentId: paymentIntent.id,
      checkoutSessionId: sessionId,
      orderId: session.status === 'paid' ? session.orderId : undefined,
      paymentStatus: session.status === 'paid' ? 'paid' : 'pending',
      pending: session.status !== 'paid',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify payment.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
