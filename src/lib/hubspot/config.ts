import { getSetting } from '@/lib/settings/serverSettings';

/**
 * Resolve the HubSpot private-app access token.
 * DB setting (Admin → Settings) takes precedence, then the env fallback.
 * Server-only — never expose this token to the client.
 */
export async function resolveHubspotToken(): Promise<string | null> {
  const fromDb = await getSetting('hubspot', 'access_token');
  const token = (fromDb || process.env.HUBSPOT_ACCESS_TOKEN || '').trim();
  return token || null;
}

/** Sync env-only check for non-async contexts. */
export function isHubspotConfiguredFromEnv(): boolean {
  return Boolean(process.env.HUBSPOT_ACCESS_TOKEN?.trim());
}
