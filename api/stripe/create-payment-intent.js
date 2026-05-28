import { calculateOrderTotals } from './_lib/orderTotals.js';
import { parseJsonBody, rejectMethod } from './_lib/request.js';
import { getStripeClient, assertStripeConfigured, getStripeMode } from './_lib/stripeClient.js';
import { validateCreatePaymentIntentBody } from './_lib/validation.js';

const MIN_AMOUNT_CENTS = 50;

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

  const validated = validateCreatePaymentIntentBody(body);
  if (!validated.ok) {
    return response.status(validated.status).json({ error: validated.error });
  }

  const { email, orderId, couponCode, shippingMethod, lineItems } = validated.data;
  const totals = calculateOrderTotals(lineItems, { couponCode, shippingMethod });
  const amountCents = Math.round(totals.total * 100);

  if (amountCents < MIN_AMOUNT_CENTS) {
    return response.status(400).json({ error: 'Order total is below the minimum charge amount.' });
  }

  try {
    const stripe = getStripeClient();
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

    return response.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountCents,
      currency: 'usd',
      mode: getStripeMode(),
    });
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create payment intent.';
    return response.status(502).json({ error: message });
  }
}
