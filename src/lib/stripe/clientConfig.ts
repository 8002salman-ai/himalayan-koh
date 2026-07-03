import { loadStripeConfig, type StripePublicConfig } from './publicConfig';

export type { StripePublicConfig } from './publicConfig';

let cachedConfig: StripePublicConfig | null = null;

export async function getStripeClientConfig(): Promise<StripePublicConfig> {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await loadStripeConfig();
  return cachedConfig;
}
