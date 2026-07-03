export interface StripePublicConfig {
  publishableKey: string;
  publishableKeySource: 'db' | 'env' | 'unset';
  configured: boolean;
  mode: 'test' | 'live';
  webhookConfigured: boolean;
}

export async function loadStripeConfig(): Promise<StripePublicConfig> {
  const response = await fetch('/api/stripe/config');
  if (!response.ok) {
    throw new Error('Unable to load Stripe configuration.');
  }
  return response.json() as Promise<StripePublicConfig>;
}
