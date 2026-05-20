import type { CartItem } from '../../store/cartStore';

export const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
export const isStripeConfigured = Boolean(stripePublishableKey);

export interface PaymentIntentDraft {
  amount: number;
  currency: 'usd';
  metadata: {
    email: string;
    cartItemCount: string;
    couponCode?: string;
  };
}

export interface CreatePaymentIntentPayload {
  email: string;
  orderId?: string;
  couponCode?: string;
  shippingMethod?: 'standard' | 'expedited';
  items: Pick<CartItem, 'id' | 'name' | 'quantity' | 'price' | 'grainSize'>[];
}

/** Client-side preview only — authoritative amount comes from the server Payment Intent API. */
export function buildPaymentIntentDraft(
  payload: CreatePaymentIntentPayload,
  totalUsd: number
): PaymentIntentDraft {
  return {
    amount: Math.round(totalUsd * 100),
    currency: 'usd',
    metadata: {
      email: payload.email,
      cartItemCount: String(payload.items.reduce((sum, item) => sum + item.quantity, 0)),
      ...(payload.couponCode ? { couponCode: payload.couponCode } : {}),
    },
  };
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: 'usd';
  mode: 'test';
}

/** Server recalculates totals from line items — never trust client `amount` alone. */
export async function createStripePaymentIntent(payload: CreatePaymentIntentPayload) {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      orderId: payload.orderId,
      couponCode: payload.couponCode,
      items: payload.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        grainSize: item.grainSize,
      })),
      shippingMethod: payload.shippingMethod,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Unable to prepare card payment.');
  }

  return response.json() as Promise<PaymentIntentResponse>;
}

export interface VerifyStripePaymentPayload {
  orderId: string;
  paymentIntentId: string;
}

export interface VerifyStripePaymentResponse {
  ok: boolean;
  orderId: string;
  paymentIntentId: string;
  paymentStatus: 'paid';
  alreadyPaid?: boolean;
}

/** Server verifies PI with Stripe and marks the order paid (service role). */
export async function verifyStripeOrderPayment(payload: VerifyStripePaymentPayload) {
  const response = await fetch('/api/stripe/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Unable to confirm payment with the server.');
  }

  return response.json() as Promise<VerifyStripePaymentResponse>;
}

export const isStripeTestMode = stripePublishableKey.startsWith('pk_test_');
