import { publicEnv } from '@/lib/env';

/** Public site origin for Stripe return URLs (set in production on Vercel). */
function siteOrigin(): string {
  const configured = publicEnv.siteUrl?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getStripeSuccessUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/checkout/success`;
  }
  const origin = siteOrigin();
  return origin ? `${origin}/checkout/success` : '/checkout/success';
}

export function getStripeCancelUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/checkout/cancel`;
  }
  const origin = siteOrigin();
  return origin ? `${origin}/checkout/cancel` : '/checkout/cancel';
}
