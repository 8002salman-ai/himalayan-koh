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
  amount: number;
  couponCode?: string;
  items: Pick<CartItem, 'id' | 'name' | 'quantity' | 'price' | 'grainSize'>[];
}

export function buildPaymentIntentDraft(payload: CreatePaymentIntentPayload): PaymentIntentDraft {
  return {
    amount: Math.round(payload.amount * 100),
    currency: 'usd',
    metadata: {
      email: payload.email,
      cartItemCount: String(payload.items.reduce((sum, item) => sum + item.quantity, 0)),
      ...(payload.couponCode ? { couponCode: payload.couponCode } : {}),
    },
  };
}

export async function createStripePaymentIntent(payload: CreatePaymentIntentPayload) {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Unable to prepare card payment.');
  }

  return response.json() as Promise<{ clientSecret: string; paymentIntentId: string }>;
}
