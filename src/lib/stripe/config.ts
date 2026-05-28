import { publicEnv } from '@/lib/env';

/** Publishable key — client only. Never put STRIPE_SECRET_KEY here. */
export function getStripePublishableKey(): string {
  return publicEnv.stripePublishableKey;
}

export const stripePublishableKey = getStripePublishableKey();
export const isStripeConfigured = Boolean(stripePublishableKey);
export const isStripeTestMode = stripePublishableKey.startsWith('pk_test_');
