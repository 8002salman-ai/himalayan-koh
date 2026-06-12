import { NextResponse } from 'next/server';
import { calculateOrderTotals } from '@/lib/stripe/server/orderTotals';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getStripeClient, getStripeMode, stripeConfigError } from '@/lib/stripe/server/stripe';
import { validateCreatePaymentIntentBody } from '@/lib/stripe/server/validation';

const MIN_AMOUNT_CENTS = 50;

export async function POST(request: Request) {
  const configError = await stripeConfigError();
  if (configError) return configError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateCreatePaymentIntentBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const { email, orderId, couponCode, shippingMethod, lineItems } = validated.data;

  let amountCents: number;

  if (orderId) {
    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    amountCents = Math.round(Number((order as { total: number }).total) * 100);
  } else {
    const totals = calculateOrderTotals(lineItems, { couponCode, shippingMethod });
    amountCents = Math.round(totals.total * 100);
  }

  if (amountCents < MIN_AMOUNT_CENTS) {
    return NextResponse.json({ error: 'Order total is below the minimum charge amount.' }, { status: 400 });
  }

  try {
    const stripe = await getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      receipt_email: email,
      automatic_payment_methods: { enabled: true },
      metadata: {
        email,
        ...(orderId ? { order_id: orderId } : {}),
        coupon_code: couponCode.trim().toUpperCase(),
        shipping_method: shippingMethod,
        cart_item_count: String(lineItems.reduce((sum, item) => sum + item.quantity, 0)),
        integration: 'himalayan_koh_checkout_v1',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountCents,
      currency: 'usd',
      mode: await getStripeMode(),
    });
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create payment intent.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
