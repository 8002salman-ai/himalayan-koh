export interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'url';
  placeholder: string;
  hint?: string;
  /** Matching process.env key used as fallback when DB value is absent. */
  envFallback: string;
}

export interface SettingsCategory {
  id: string;
  label: string;
  description: string;
  docsHref?: string;
  fields: SettingField[];
}

/**
 * Central registry of all configurable service integrations.
 * To add a new service: append an entry here — the DB, API, and admin UI
 * all work generically from this list.
 */
export const SETTINGS_REGISTRY: SettingsCategory[] = [
  {
    id: 'shippo',
    label: 'Shippo — Shipping',
    description: 'Live carrier rates (USPS, UPS, FedEx) and one-click shipping label creation.',
    docsHref: 'https://apps.goshippo.com/settings/api',
    fields: [
      {
        key: 'api_key',
        label: 'Shippo API Key',
        type: 'password',
        placeholder: 'shippo_test_... or shippo_live_...',
        hint: 'Get it from Shippo → Settings → API',
        envFallback: 'SHIPPO_API_KEY',
      },
      {
        key: 'from_name',
        label: 'Ship-From Business Name',
        type: 'text',
        placeholder: 'Himalayan Koh',
        envFallback: 'SHIPPO_FROM_NAME',
      },
      {
        key: 'from_street1',
        label: 'Ship-From Street',
        type: 'text',
        placeholder: '12620 FM 1960 W Ste A-4',
        envFallback: 'SHIPPO_FROM_STREET1',
      },
      {
        key: 'from_city',
        label: 'City',
        type: 'text',
        placeholder: 'Houston',
        envFallback: 'SHIPPO_FROM_CITY',
      },
      {
        key: 'from_state',
        label: 'State',
        type: 'text',
        placeholder: 'TX',
        envFallback: 'SHIPPO_FROM_STATE',
      },
      {
        key: 'from_zip',
        label: 'ZIP Code',
        type: 'text',
        placeholder: '77065',
        envFallback: 'SHIPPO_FROM_ZIP',
      },
      {
        key: 'from_country',
        label: 'Country',
        type: 'text',
        placeholder: 'US',
        envFallback: 'SHIPPO_FROM_COUNTRY',
      },
      {
        key: 'from_phone',
        label: 'Phone',
        type: 'text',
        placeholder: '8322246466',
        envFallback: 'SHIPPO_FROM_PHONE',
      },
      {
        key: 'from_email',
        label: 'From Email',
        type: 'email',
        placeholder: 'orders@himalayankoh.com',
        envFallback: 'SHIPPO_FROM_EMAIL',
      },
    ],
  },
  {
    id: 'stripe',
    label: 'Stripe — Payments',
    description: 'Card payment processing with 3DS support and webhook event handling.',
    docsHref: 'https://dashboard.stripe.com/test/apikeys',
    fields: [
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        placeholder: 'sk_test_... or sk_live_...',
        hint: 'Never share this key. Server-side only.',
        envFallback: 'STRIPE_SECRET_KEY',
      },
      {
        key: 'publishable_key',
        label: 'Publishable Key',
        type: 'text',
        placeholder: 'pk_test_... or pk_live_...',
        envFallback: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        placeholder: 'whsec_...',
        hint: 'From Stripe Dashboard → Webhooks, or Stripe CLI for local testing.',
        envFallback: 'STRIPE_WEBHOOK_SECRET',
      },
    ],
  },
  // ─── Add future shipping / payment services below ────────────────────────────
  // Example:
  // {
  //   id: 'easypost',
  //   label: 'EasyPost — Shipping',
  //   description: 'Alternative shipping carrier integration.',
  //   docsHref: 'https://www.easypost.com/docs/api',
  //   fields: [
  //     { key: 'api_key', label: 'EasyPost API Key', type: 'password',
  //       placeholder: 'EZT...', envFallback: 'EASYPOST_API_KEY' },
  //   ],
  // },
];
