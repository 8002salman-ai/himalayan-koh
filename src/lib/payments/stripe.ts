/** @deprecated Import from `src/lib/stripe` — kept for existing imports. */
export {
  stripePublishableKey,
  isStripeConfigured,
  isStripeTestMode,
  createStripePaymentIntent,
  verifyStripeOrderPayment,
  toPaymentError,
  type CreatePaymentIntentPayload,
} from '../stripe/client';

export type {
  StripePaymentIntentResult as PaymentIntentResponse,
  StripeVerifyPaymentResult as VerifyStripePaymentResponse,
} from '../stripe/types';
