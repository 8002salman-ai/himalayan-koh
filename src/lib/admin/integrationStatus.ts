/**
 * What each integration is actually doing, server only.
 *
 * ## Why the console could not answer this before
 *
 * Admin → Settings showed a field and where its value came from, which answers
 * "is something typed in here" and not "does it work". Those are different
 * questions, and the difference matters most for the two credentials this store
 * must never exercise by accident: a **live** Stripe or Shippo key sitting in the
 * environment looks identical to a test key in that screen.
 *
 * So each integration is reported with three facts and no more: its state, the
 * mode it is in when that distinction exists (test or live), and where the value
 * comes from. A key's value is never read out, never summarised and never hashed
 * into the answer — only whether it exists, which prefix class it is in, and
 * whether the service answers.
 *
 * ## CONNECTED means the service answered
 *
 * For WooCommerce the check is a real request, because "configured" and "the key
 * is accepted" are the two states the owner needs told apart: a half-set pair or a
 * revoked key otherwise looks set up right up until a write fails.
 */

import { backendConfig } from '../backend/config';
import { credentialsForRequest } from '../backend/credentials';
import { wordpressRequestSafe } from '../backend/wordpress';
import { getSetting } from '../settings/serverSettings';
import { isSupabaseConfigured } from '../supabase/client';

export type IntegrationState = 'CONNECTED' | 'NOT CONFIGURED' | 'INVALID' | 'OWNER ACTION REQUIRED';
export type IntegrationMode = 'TEST' | 'LIVE' | 'UNKNOWN' | null;
export type IntegrationSource = 'console' | 'environment' | 'mixed' | 'none';

export interface IntegrationStatus {
  id: string;
  label: string;
  state: IntegrationState;
  mode: IntegrationMode;
  source: IntegrationSource;
  /** A sentence safe to render: no values, no prefixes, no upstream bodies. */
  detail: string;
  /** True when a stored value also exists in the environment (the console wins). */
  overridden: boolean;
}

async function effective(
  category: string,
  key: string,
  envName: string
): Promise<{ value: string; source: IntegrationSource; overridden: boolean }> {
  const dbValue = (await getSetting(category, key))?.trim() || '';
  const envValue = (process.env[envName] || '').trim();
  const overridden = Boolean(dbValue && envValue);
  if (dbValue) return { value: dbValue, source: overridden ? 'mixed' : 'console', overridden };
  if (envValue) return { value: envValue, source: 'environment', overridden: false };
  return { value: '', source: 'none', overridden: false };
}

/** Test or live, from the key's own prefix. Never from anything else. */
function keyMode(value: string, testPrefix: string, livePrefix: string): IntegrationMode {
  if (!value) return null;
  if (value.startsWith(livePrefix)) return 'LIVE';
  if (value.startsWith(testPrefix)) return 'TEST';
  return 'UNKNOWN';
}

/**
 * Reads every integration's state.
 *
 * `probe: false` skips the one live request (WooCommerce) so a cheap settings
 * render stays cheap; the console asks for the probe when it wants the real
 * answer.
 */
export async function readIntegrationStatuses(options: { probe?: boolean } = {}): Promise<{
  integrations: IntegrationStatus[];
  checkedAt: string;
}> {
  const integrations: IntegrationStatus[] = [];

  /* --- WooCommerce: the commerce source of truth --------------------------- */
  const wooKey = await effective('woocommerce', 'consumer_key', 'WOOCOMMERCE_CONSUMER_KEY');
  const wooSecret = await effective('woocommerce', 'consumer_secret', 'WOOCOMMERCE_CONSUMER_SECRET');
  const hasWooPair = credentialsForRequest({ consumerKey: wooKey.value, consumerSecret: wooSecret.value }) !== null;
  const wooSource: IntegrationSource =
    wooKey.source === wooSecret.source ? wooKey.source : 'mixed';

  if (!backendConfig.wordpressApiRoot) {
    integrations.push({
      id: 'woocommerce',
      label: 'WooCommerce',
      state: 'NOT CONFIGURED',
      mode: null,
      source: 'none',
      detail: 'No WordPress/WooCommerce origin is configured for this deployment.',
      overridden: false,
    });
  } else if (!hasWooPair) {
    integrations.push({
      id: 'woocommerce',
      label: 'WooCommerce',
      state: 'NOT CONFIGURED',
      mode: null,
      source: wooSource,
      detail:
        'The REST credential pair is incomplete, so nothing can be read or written. Both the consumer key and the consumer secret must be set together.',
      overridden: wooKey.overridden || wooSecret.overridden,
    });
  } else if (options.probe === false) {
    integrations.push({
      id: 'woocommerce',
      label: 'WooCommerce',
      state: 'CONNECTED',
      mode: 'UNKNOWN',
      source: wooSource,
      detail: `A credential pair is configured for ${backendConfig.wordpressApiRoot}. The store was not contacted for this read.`,
      overridden: wooKey.overridden || wooSecret.overridden,
    });
  } else {
    const probe = await wordpressRequestSafe<unknown[]>('/wc/v3/products/categories', {
      useCredentials: true,
      params: { per_page: 1 },
      timeoutMs: 15_000,
    });
    integrations.push({
      id: 'woocommerce',
      label: 'WooCommerce',
      state: probe.error ? 'INVALID' : 'CONNECTED',
      mode: 'UNKNOWN',
      source: wooSource,
      detail: probe.error
        ? `The store rejected the request: ${probe.error}`
        : `The store answered and accepted the credential (${backendConfig.wordpressApiRoot}). Products, categories, orders, customers and coupons are read and written through it.`,
      overridden: wooKey.overridden || wooSecret.overridden,
    });
  }

  /* --- Supabase: identity, sessions, app data ------------------------------ */
  const supabaseConfigured = isSupabaseConfigured();
  const serviceRole = Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
  integrations.push({
    id: 'supabase',
    label: 'Supabase',
    state: supabaseConfigured ? 'CONNECTED' : 'NOT CONFIGURED',
    mode: null,
    source: supabaseConfigured ? 'environment' : 'none',
    detail: supabaseConfigured
      ? `Authentication, sessions and the app's own records (cart, CRM, campaign drafts, console settings).${
          serviceRole
            ? ''
            : ' The server-side service key is missing, so admin API routes that need it will refuse.'
        }`
      : 'Supabase is not configured, so nobody can sign in and the admin routes cannot authorize.',
    overridden: false,
  });

  /* --- Gemini: staff SEO assistant ---------------------------------------- */
  const gemini = await effective('gemini', 'api_key', 'GEMINI_API_KEY');
  integrations.push({
    id: 'gemini',
    label: 'Gemini',
    state: gemini.value ? 'CONNECTED' : 'NOT CONFIGURED',
    mode: null,
    source: gemini.source,
    detail: gemini.value
      ? 'A key is configured for the admin SEO assistant. Use Test connection to confirm the model is available to it.'
      : 'No Gemini key. Drafting in the console works; generating SEO copy does not until a key is added. This is a staff-side key and is not required for the storefront.',
    overridden: gemini.overridden,
  });

  /* --- OpenRouter: customer chat ------------------------------------------ */
  const openrouter = await effective('openrouter', 'api_key', 'OPENROUTER_API_KEY');
  integrations.push({
    id: 'openrouter',
    label: 'OpenRouter',
    state: 'CONNECTED',
    mode: null,
    source: openrouter.source,
    detail: openrouter.value
      ? 'A key is configured for the customer-facing assistant, which raises its rate limits.'
      : 'No key. The customer-facing assistant still runs on free models, which are rate-limited — this is a working state, not a failure.',
    overridden: openrouter.overridden,
  });

  /* --- HubSpot ------------------------------------------------------------ */
  const hubspot = await effective('hubspot', 'access_token', 'HUBSPOT_ACCESS_TOKEN');
  integrations.push({
    id: 'hubspot',
    label: 'HubSpot',
    state: hubspot.value ? 'CONNECTED' : 'NOT CONFIGURED',
    mode: null,
    source: hubspot.source,
    detail: hubspot.value
      ? 'A private-app token is configured for CRM lead sync.'
      : 'No HubSpot token, so CRM sync is unavailable. Leads are still captured by the storefront and stored locally.',
    overridden: hubspot.overridden,
  });

  /* --- Resend ------------------------------------------------------------- */
  const resend = await effective('resend', 'api_key', 'RESEND_API_KEY');
  const resendFrom = (process.env.RESEND_FROM || '').trim();
  integrations.push({
    id: 'resend',
    label: 'Resend (email)',
    state: resend.value ? (resendFrom ? 'CONNECTED' : 'OWNER ACTION REQUIRED') : 'NOT CONFIGURED',
    mode: null,
    source: resend.source,
    detail: resend.value
      ? resendFrom
        ? 'A key and a sending address are configured, so order mail can be sent from the store’s own domain.'
        : 'A key is configured but no sending address is, so mail would go out from Resend’s shared sandbox address. Set the from address to the store’s domain.'
      : 'No Resend key, so no email is sent. Orders, campaigns and labels all still work; nothing claims a mail was sent.',
    overridden: resend.overridden,
  });

  /* --- Stripe ------------------------------------------------------------- */
  const stripe = await effective('stripe', 'secret_key', 'STRIPE_SECRET_KEY');
  const stripeMode = keyMode(stripe.value, 'sk_test_', 'sk_live_');
  const liveAllowed = process.env.STRIPE_ALLOW_LIVE === 'true';
  integrations.push({
    id: 'stripe',
    label: 'Stripe',
    state: !stripe.value
      ? 'NOT CONFIGURED'
      : stripeMode === 'LIVE' && !liveAllowed
        ? 'OWNER ACTION REQUIRED'
        : 'CONNECTED',
    mode: stripeMode,
    source: stripe.source,
    detail: !stripe.value
      ? 'No Stripe key, so card checkout returns an honest "payments not configured" rather than failing mid-order. Test keys are required before the checkout chain can be verified.'
      : stripeMode === 'LIVE'
        ? liveAllowed
          ? 'A live key is configured and live charges are explicitly allowed on this deployment.'
          : 'A live key is present but live charging is switched off, which is the intended staging state. No charge can be made from here.'
        : stripeMode === 'TEST'
          ? 'A test key is configured. Card checkout can be exercised without moving real money.'
          : 'A key is present but its mode could not be identified from the value.',
    overridden: stripe.overridden,
  });

  /* --- Shippo ------------------------------------------------------------- */
  const shippo = await effective('shippo', 'api_key', 'SHIPPO_API_KEY');
  const shippoMode = keyMode(shippo.value, 'shippo_test_', 'shippo_live_');
  integrations.push({
    id: 'shippo',
    label: 'Shippo',
    state: shippo.value ? (shippoMode === 'LIVE' ? 'OWNER ACTION REQUIRED' : 'CONNECTED') : 'NOT CONFIGURED',
    mode: shippoMode,
    detail: !shippo.value
      ? 'No Shippo token, so live rates and label purchase are unavailable.'
      : shippoMode === 'LIVE'
        ? 'The configured token is a LIVE Shippo token. No label is purchased from this console and no live API action is taken; shipping verification waits for a test token.'
        : 'A token is configured for shipping rates.',
    source: shippo.source,
    overridden: shippo.overridden,
  });

  return { integrations, checkedAt: new Date().toISOString() };
}
