import Stripe from 'stripe';

/**
 * @returns {Stripe}
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (secretKey.startsWith('sk_live_')) {
    throw new Error('Live Stripe keys are blocked. Use sk_test_... only.');
  }
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
}

export function assertStripeConfigured(response) {
  if (!process.env.STRIPE_SECRET_KEY) {
    response.status(503).json({
      error: 'Stripe payments are not configured. Add STRIPE_SECRET_KEY (test mode) in Vercel.',
    });
    return false;
  }
  if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    response.status(503).json({
      error: 'Live Stripe keys are blocked in this project. Use test mode keys only (sk_test_...).',
    });
    return false;
  }
  return true;
}
