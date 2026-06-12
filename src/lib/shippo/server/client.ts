import { getSetting } from '@/lib/settings/serverSettings';

const SHIPPO_API_BASE = 'https://api.goshippo.com';

async function resolveShippoApiKey(): Promise<string> {
  const dbKey = await getSetting('shippo', 'api_key');
  return dbKey || process.env.SHIPPO_API_KEY?.trim() || '';
}

export async function shippoRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = await resolveShippoApiKey();
  if (!apiKey) {
    throw new Error('SHIPPO_API_KEY is not configured.');
  }

  const response = await fetch(`${SHIPPO_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      (payload as { detail?: string }).detail ||
      (payload as { message?: string }).message ||
      JSON.stringify(payload);
    throw new Error(`Shippo API error (${response.status}): ${detail}`);
  }

  return payload as T;
}
