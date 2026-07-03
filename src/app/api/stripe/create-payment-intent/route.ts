import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { getStripeClient, getStripeMode, stripeConfigError } from '@/lib/stripe/server/stripe';
import { validateCreatePaymentIntentBody } from '@/lib/stripe/server/validation';
import { checkRateLimit } from '@/lib/rateLimit';

const MIN_AMOUNT_CENTS = 50;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`payment:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

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

  const { email, orderId, couponCode, shippingMethod, itemCount } = validated.data;

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

  const amountCents = Math.round(Number((order as { total: number }).total) * 100);

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
        cart_item_count: String(itemCount),
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
