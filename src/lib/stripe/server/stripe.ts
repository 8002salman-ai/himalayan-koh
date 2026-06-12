import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings/serverSettings';

async function resolveStripeSecretKey(): Promise<string> {
  const dbKey = await getSetting('stripe', 'secret_key');
  return dbKey || process.env.STRIPE_SECRET_KEY || '';
}

export async function getStripeClient(): Promise<Stripe> {
  const secretKey = await resolveStripeSecretKey();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (secretKey.startsWith('sk_live_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
    throw new Error('Live Stripe keys require STRIPE_ALLOW_LIVE=true on the server.');
  }
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
}

export async function getStripeMode(): Promise<'test' | 'live'> {
  const key = await resolveStripeSecretKey();
  return key.startsWith('sk_live_') ? 'live' : 'test';
}

export async function resolveStripeWebhookSecret(): Promise<string> {
  const dbSecret = await getSetting('stripe', 'webhook_secret');
  return dbSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
}

export async function stripeConfigError(): Promise<NextResponse | null> {
  const secretKey = await resolveStripeSecretKey();
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe payments are not configured. Add STRIPE_SECRET_KEY in Admin → Settings or .env.local.' },
      { status: 503 },
    );
  }
  if (secretKey.startsWith('sk_live_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
    return NextResponse.json(
      { error: 'Live Stripe keys require STRIPE_ALLOW_LIVE=true in Vercel environment variables.' },
      { status: 503 },
    );
  }
  return null;
}
