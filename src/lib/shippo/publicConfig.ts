export interface ShippoPublicConfig {
  enabled: boolean;
  configured: boolean;
  reason: string | null;
}

/**
 * Runtime Shippo status. Falls back to disabled if the endpoint is unreachable
 * so checkout still works with flat-rate shipping.
 */
export async function loadShippoConfig(): Promise<ShippoPublicConfig> {
  try {
    const response = await fetch('/api/shippo/config');
    if (!response.ok) {
      return { enabled: false, configured: false, reason: 'Unable to load Shippo configuration.' };
    }
    return (await response.json()) as ShippoPublicConfig;
  } catch {
    return { enabled: false, configured: false, reason: 'Unable to load Shippo configuration.' };
  }
}
