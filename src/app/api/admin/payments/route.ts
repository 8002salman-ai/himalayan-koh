import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSettingsForCategory, upsertSettings } from '@/lib/settings/serverSettings';
import { resolveStripeSecretKey, resolveStripeWebhookSecret, getStripeClient } from '@/lib/stripe/server/stripe';

export const dynamic = 'force-dynamic';

function maskKey(val: string | null | undefined): string {
  if (!val || val.length < 8) return '';
  return val.slice(0, 4) + '••••••••' + val.slice(-4);
}

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [stripeDbSettings, paymentSettings] = await Promise.all([
      getSettingsForCategory('stripe'),
      getSettingsForCategory('payments'),
    ]);

    const stripeSecret = await resolveStripeSecretKey();
    const stripeWebhook = await resolveStripeWebhookSecret();
    const stripePk =
      stripeDbSettings.publishable_key?.trim() ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
      process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
      '';

    const stripeConfigured = Boolean(stripeSecret && stripePk);
    const stripeMode = stripeSecret.startsWith('sk_live_') ? 'production' : 'sandbox';
    const stripeEnabled = paymentSettings.stripe_enabled !== 'false' && stripeConfigured;

    const primary = (paymentSettings.primary_provider as any) || (stripeConfigured ? 'stripe' : 'none');
    const backup = (paymentSettings.backup_provider as any) || 'none';

    const providers = [
      {
        id: 'stripe',
        name: 'Stripe',
        enabled: stripeEnabled,
        role: primary === 'stripe' ? 'primary' : backup === 'stripe' ? 'backup' : 'available',
        mode: stripeMode,
        status: !stripeConfigured
          ? 'not_configured'
          : !stripeEnabled
          ? 'disabled'
          : stripeMode === 'production'
          ? 'ready'
          : 'sandbox',
        isConfigured: stripeConfigured,
        keys: {
          publishableKey: {
            configured: Boolean(stripePk),
            masked: maskKey(stripePk),
            source: stripeDbSettings.publishable_key ? 'db' : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'env' : 'none',
          },
          secretKey: {
            configured: Boolean(stripeSecret),
            masked: maskKey(stripeSecret),
            source: stripeDbSettings.secret_key ? 'db' : process.env.STRIPE_SECRET_KEY ? 'env' : 'none',
          },
          webhookSecret: {
            configured: Boolean(stripeWebhook),
            masked: maskKey(stripeWebhook),
            source: stripeDbSettings.webhook_secret ? 'db' : process.env.STRIPE_WEBHOOK_SECRET ? 'env' : 'none',
          },
        },
        dashboardUrl: 'https://dashboard.stripe.com',
        setupChecklist: [
          'Create a Stripe account',
          'Add Publishable Key (pk_test_... or pk_live_...)',
          'Add Secret Key (sk_test_... or sk_live_...)',
          'Configure Webhook endpoint (/api/stripe/webhook)',
        ],
        lastTestAt: paymentSettings.stripe_last_test_at || undefined,
        lastTestOk: paymentSettings.stripe_last_test_ok === 'true',
        lastError: paymentSettings.stripe_last_error || undefined,
      },
      {
        id: 'paypal',
        name: 'PayPal',
        enabled: paymentSettings.paypal_enabled === 'true',
        role: primary === 'paypal' ? 'primary' : backup === 'paypal' ? 'backup' : 'available',
        mode: 'sandbox',
        status: 'not_configured',
        isConfigured: false,
        keys: {
          clientId: { configured: false, masked: '', source: 'none' },
          clientSecret: { configured: false, masked: '', source: 'none' },
        },
        dashboardUrl: 'https://developer.paypal.com/dashboard',
        setupChecklist: [
          'Create a PayPal Developer app',
          'Add Client ID and Client Secret',
          'Configure IPN / Webhooks for order completion',
        ],
      },
      {
        id: 'square',
        name: 'Square',
        enabled: paymentSettings.square_enabled === 'true',
        role: primary === 'square' ? 'primary' : backup === 'square' ? 'backup' : 'available',
        mode: 'sandbox',
        status: 'not_configured',
        isConfigured: false,
        keys: {
          applicationId: { configured: false, masked: '', source: 'none' },
          accessToken: { configured: false, masked: '', source: 'none' },
        },
        dashboardUrl: 'https://developer.squareup.com/apps',
        setupChecklist: [
          'Create Square Developer Application',
          'Get Sandbox/Production Application ID & Access Token',
        ],
      },
      {
        id: 'braintree',
        name: 'Braintree',
        enabled: paymentSettings.braintree_enabled === 'true',
        role: primary === 'braintree' ? 'primary' : backup === 'braintree' ? 'backup' : 'available',
        mode: 'sandbox',
        status: 'not_configured',
        isConfigured: false,
        keys: {
          merchantId: { configured: false, masked: '', source: 'none' },
          publicKey: { configured: false, masked: '', source: 'none' },
          privateKey: { configured: false, masked: '', source: 'none' },
        },
        dashboardUrl: 'https://sandbox.braintreegateway.com',
        setupChecklist: [
          'Sign in to Braintree Sandbox',
          'Obtain Merchant ID, Public Key, and Private Key',
        ],
      },
      {
        id: 'payoneer',
        name: 'Payoneer Checkout',
        enabled: paymentSettings.payoneer_enabled === 'true',
        role: primary === 'payoneer' ? 'primary' : backup === 'payoneer' ? 'backup' : 'available',
        mode: 'sandbox',
        status: 'not_configured',
        isConfigured: false,
        keys: {
          merchantCode: { configured: false, masked: '', source: 'none' },
          apiKey: { configured: false, masked: '', source: 'none' },
        },
        dashboardUrl: 'https://checkout.payoneer.com',
        setupChecklist: [
          'Register Payoneer Checkout Merchant Account',
          'Obtain API Credentials',
        ],
      },
      {
        id: 'authorize_net',
        name: 'Authorize.Net',
        enabled: paymentSettings.authorize_net_enabled === 'true',
        role: primary === 'authorize_net' ? 'primary' : backup === 'authorize_net' ? 'backup' : 'available',
        mode: 'sandbox',
        status: 'not_configured',
        isConfigured: false,
        keys: {
          apiLoginId: { configured: false, masked: '', source: 'none' },
          transactionKey: { configured: false, masked: '', source: 'none' },
        },
        dashboardUrl: 'https://sandbox.authorize.net',
        setupChecklist: [
          'Log in to Authorize.Net Sandbox Merchant Interface',
          'Generate API Login ID and Transaction Key',
        ],
      },
    ];

    return NextResponse.json({
      ok: true,
      primary,
      backup,
      providers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to load payment providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      action: 'test' | 'toggle' | 'set_primary' | 'set_backup';
      provider: string;
      enabled?: boolean;
    };

    const { action, provider } = body;

    if (action === 'toggle') {
      await upsertSettings('payments', {
        [`${provider}_enabled`]: body.enabled ? 'true' : 'false',
      });
      return NextResponse.json({
        ok: true,
        message: `${provider} ${body.enabled ? 'enabled' : 'disabled'}.`,
      });
    }

    if (action === 'set_primary') {
      await upsertSettings('payments', {
        primary_provider: provider,
      });
      return NextResponse.json({
        ok: true,
        message: `Primary payment provider set to ${provider}.`,
      });
    }

    if (action === 'set_backup') {
      await upsertSettings('payments', {
        backup_provider: provider,
      });
      return NextResponse.json({
        ok: true,
        message: `Backup payment provider set to ${provider}.`,
      });
    }

    if (action === 'test') {
      if (provider === 'stripe') {
        const stripeSecret = await resolveStripeSecretKey();
        if (!stripeSecret) {
          await upsertSettings('payments', {
            stripe_last_test_at: new Date().toISOString(),
            stripe_last_test_ok: 'false',
            stripe_last_error: 'STRIPE_SECRET_KEY is not configured',
          });
          return NextResponse.json({
            ok: false,
            error: 'Stripe secret key is not configured. Add credentials in Admin or environment variables.',
          });
        }

        try {
          const stripe = await getStripeClient();
          const balance = await stripe.balance.retrieve();
          await upsertSettings('payments', {
            stripe_last_test_at: new Date().toISOString(),
            stripe_last_test_ok: 'true',
            stripe_last_error: '',
          });
          return NextResponse.json({
            ok: true,
            message: `Stripe connection verified successfully! Livemode: ${balance.livemode}.`,
          });
        } catch (testErr) {
          const msg = (testErr as Error).message || 'Stripe API call failed';
          await upsertSettings('payments', {
            stripe_last_test_at: new Date().toISOString(),
            stripe_last_test_ok: 'false',
            stripe_last_error: msg,
          });
          return NextResponse.json({
            ok: false,
            error: msg,
          });
        }
      }

      return NextResponse.json({
        ok: false,
        error: `${provider} credentials are not configured on this server.`,
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to perform payment action' },
      { status: 500 }
    );
  }
}
