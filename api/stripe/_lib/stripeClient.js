import Stripe from 'stripe';

/**
 * @returns {Stripe}
 */
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (secretKey.startsWith('sk_live_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
    throw new Error('Live Stripe keys require STRIPE_ALLOW_LIVE=true on the server.');
  }
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
}

export function getStripeMode() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.startsWith('sk_live_') ? 'live' : 'test';
}

export function assertStripeConfigured(response) {
  if (!process.env.STRIPE_SECRET_KEY) {
    response.status(503).json({
      error: 'Stripe payments are not configured. Add STRIPE_SECRET_KEY in .env.local or Vercel.',
    });
    return false;
  }
  if (
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') &&
    process.env.STRIPE_ALLOW_LIVE !== 'true'
  ) {
    response.status(503).json({
      error: 'Live Stripe keys require STRIPE_ALLOW_LIVE=true in Vercel environment variables.',
    });
    return false;
  }
  return true;
}
