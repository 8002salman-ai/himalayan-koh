import type { CartItem } from '../../store/cartStore';
import { readApiError, toPaymentError } from './errors';
import { isStripeTestMode, stripePublishableKey } from './config';
import type { StripePaymentIntentResult, StripeVerifyPaymentResult } from './types';

export { stripePublishableKey, isStripeConfigured, isStripeTestMode } from './config';

export interface CreatePaymentIntentPayload {
  email: string;
  orderId?: string;
  couponCode?: string;
  shippingMethod?: 'standard' | 'expedited';
  items: Pick<CartItem, 'id' | 'name' | 'quantity' | 'price' | 'grainSize'>[];
}

export async function createStripePaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<StripePaymentIntentResult> {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      orderId: payload.orderId,
      couponCode: payload.couponCode,
      shippingMethod: payload.shippingMethod,
      items: payload.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        grainSize: item.grainSize,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Unable to prepare card payment.'));
  }

  return response.json() as Promise<StripePaymentIntentResult>;
}

export async function verifyStripeOrderPayment(payload: {
  orderId: string;
  paymentIntentId: string;
}): Promise<StripeVerifyPaymentResult> {
  const response = await fetch('/api/stripe/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Unable to confirm payment with the server.'));
  }

  return response.json() as Promise<StripeVerifyPaymentResult>;
}

export { toPaymentError };
