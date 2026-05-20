import { calculateOrderTotals } from './_lib/orderTotals.js';
import { getStripeClient, assertStripeConfigured } from './_lib/stripeClient.js';

const MIN_AMOUNT_CENTS = 50;

/**
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

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  const couponCode = typeof body?.couponCode === 'string' ? body.couponCode : '';
  const shippingMethod = body?.shippingMethod === 'expedited' ? 'expedited' : 'standard';
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ error: 'A valid email is required.' });
  }

  if (items.length === 0) {
    return response.status(400).json({ error: 'Cart items are required to create a payment.' });
  }

  const lineItems = items
    .map((item) => ({
      quantity: Math.max(1, Math.floor(Number(item?.quantity) || 0)),
      unitPrice: Math.max(0, Number(item?.price ?? item?.unitPrice) || 0),
    }))
    .filter((item) => item.quantity > 0 && item.unitPrice > 0);

  if (lineItems.length === 0) {
    return response.status(400).json({ error: 'No valid cart line items were provided.' });
  }

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
      mode: 'test',
    });
  } catch (error) {
    console.error('Stripe PaymentIntent creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create payment intent.';
    return response.status(502).json({ error: message });
  }
}
