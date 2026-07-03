import { NextResponse } from 'next/server';
import { getSettingsForCategory } from '@/lib/settings/serverSettings';
import { resolveStripeSecretKey } from '@/lib/stripe/server/stripe';

export const runtime = 'nodejs';

export async function GET() {
  const settings = await getSettingsForCategory('stripe');

  const publishableKey =
    settings.publishable_key?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
    '';

  const secretKey = await resolveStripeSecretKey();
  const configured = Boolean(publishableKey && secretKey);
  const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test';

  return NextResponse.json({
    publishableKey,
    publishableKeySource: settings.publishable_key ? 'db' : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'env' : 'unset',
    configured,
    mode,
    webhookConfigured: Boolean(settings.webhook_secret?.trim() || process.env.STRIPE_WEBHOOK_SECRET),
  });
}
