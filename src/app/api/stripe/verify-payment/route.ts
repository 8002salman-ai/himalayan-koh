import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getStripeClient, stripeConfigError } from '@/lib/stripe/server/stripe';
import { markOrderPaid, resolveStripePaymentMethodLabel } from '@/lib/stripe/server/updateOrderPayment';
import { validateVerifyPaymentBody } from '@/lib/stripe/server/validation';

export async function POST(request: Request) {
  const configError = await stripeConfigError();
  if (configError) return configError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateVerifyPaymentBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const { orderId, paymentIntentId } = validated.data;

  try {
    const stripe = await getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Guard: the PaymentIntent must belong to this order (checked for every status).
    const metadataOrderId = paymentIntent.metadata?.order_id;
    if (metadataOrderId && metadataOrderId !== orderId) {
      return NextResponse.json({ error: 'Payment does not match this order.' }, { status: 400 });
    }

    // BNPL methods (Klarna, Afterpay/Clearpay, Affirm) and some bank-redirect flows
    // settle ASYNCHRONOUSLY: the PaymentIntent lands in `processing` (or briefly
    // `requires_action`) at return time and only flips to `succeeded` later, via the
    // webhook (payment_intent.succeeded -> markOrderPaid). Treating those as an error
    // would show the customer a false "payment failed" even though the order will be
    // confirmed moments later. So we report them as a non-terminal "pending" success
    // and let the webhook finalize the order. Only genuinely non-progressing statuses
    // (requires_payment_method / canceled) are treated as failures here.
    if (paymentIntent.status === 'processing' || paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        ok: true,
        orderId,
        paymentIntentId,
        paymentStatus: 'pending',
        pending: true,
        status: paymentIntent.status,
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        {
          error: 'Payment has not completed yet. Please try again or use a different method.',
          status: paymentIntent.status,
        },
        { status: 402 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const orderTotal = (order as { total: number }).total;
    const expectedCents = Math.round(Number(orderTotal) * 100);
    if (paymentIntent.amount !== expectedCents) {
      return NextResponse.json({ error: 'Payment amount does not match order total.' }, { status: 400 });
    }

    const result = await markOrderPaid(
      orderId,
      paymentIntentId,
      resolveStripePaymentMethodLabel(paymentIntent.payment_method_types)
    );

    return NextResponse.json({
      ok: true,
      orderId,
      paymentIntentId,
      paymentStatus: 'paid',
      alreadyPaid: result.alreadyPaid,
    });
  } catch (error) {
    console.error('Stripe payment verification failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to verify payment.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
