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
  {
    id: 'openrouter',
    label: 'OpenRouter — AI Chat Assistant',
    description: 'Powers the customer-facing AI chat widget. Free models work without a key; add a key for higher limits.',
    docsHref: 'https://openrouter.ai/keys',
    fields: [
      {
        key: 'api_key',
        label: 'OpenRouter API Key',
        type: 'password',
        placeholder: 'sk-or-v1-...',
        hint: 'Get it from openrouter.ai/keys. Leave blank to use free models (rate-limited).',
        envFallback: 'OPENROUTER_API_KEY',
      },
      {
        key: 'model',
        label: 'Preferred AI Model (optional)',
        type: 'text',
        placeholder: 'deepseek/deepseek-v4-flash:free',
        hint: 'Leave blank to use the default free model. Find model IDs at openrouter.ai/models.',
        envFallback: 'OPENROUTER_MODEL',
      },
    ],
  },
  {
    id: 'dealer_program',
    label: 'Dealer Program — Defaults',
    description: 'Default terms applied to new dealer approvals. Individual dealers can still be overridden in Dealer Management.',
    fields: [
      {
        key: 'default_credit_terms',
        label: 'Default Credit Terms (days)',
        type: 'text',
        placeholder: '30',
        hint: 'Net terms applied to a dealer when first approved, e.g. 30 for Net 30.',
        envFallback: 'DEALER_DEFAULT_CREDIT_TERMS',
      },
      {
        key: 'min_order_value',
        label: 'Minimum Dealer Order Value ($)',
        type: 'text',
        placeholder: '250',
        hint: 'Informational minimum shown to dealers — not yet enforced at checkout.',
        envFallback: 'DEALER_MIN_ORDER_VALUE',
      },
      {
        key: 'support_email',
        label: 'Dealer Support Email',
        type: 'email',
        placeholder: 'dealers@himalayankoh.com',
        hint: 'Shown on the dealer support page and in approval emails.',
        envFallback: 'DEALER_SUPPORT_EMAIL',
      },
    ],
  },
  // ─── Add future services below ───────────────────────────────────────────────
];
