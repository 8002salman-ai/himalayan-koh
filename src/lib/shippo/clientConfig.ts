import { loadShippoConfig, type ShippoPublicConfig } from './publicConfig';

export type { ShippoPublicConfig } from './publicConfig';

let cachedConfig: ShippoPublicConfig | null = null;

export async function getShippoClientConfig(): Promise<ShippoPublicConfig> {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await loadShippoConfig();
  return cachedConfig;
}
