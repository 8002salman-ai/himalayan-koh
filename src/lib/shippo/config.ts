import { getSetting } from '@/lib/settings/serverSettings';
import type { ShippoAddress } from './types';

/** Client-safe check — uses NEXT_PUBLIC env flag only. */
export function isShippoEnabledOnClient(): boolean {
  return process.env.NEXT_PUBLIC_SHIPPO_ENABLED === 'true';
}

/** Sync check using env vars only (used in non-async contexts). */
export function isShippoConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY?.trim());
}

/**
 * Async config error check — reads DB first, then env vars.
 * Use this in API routes.
 */
export async function resolveShippoConfigError(): Promise<string | null> {
  const apiKey = (await getSetting('shippo', 'api_key')) || process.env.SHIPPO_API_KEY?.trim();
  if (!apiKey) {
    return 'Shippo is not configured. Add SHIPPO_API_KEY in Admin → Settings or .env.local.';
  }

  const street = (await getSetting('shippo', 'from_street1')) || process.env.SHIPPO_FROM_STREET1;
  const city = (await getSetting('shippo', 'from_city')) || process.env.SHIPPO_FROM_CITY;
  const state = (await getSetting('shippo', 'from_state')) || process.env.SHIPPO_FROM_STATE;
  const zip = (await getSetting('shippo', 'from_zip')) || process.env.SHIPPO_FROM_ZIP;

  if (!street?.trim() || !city?.trim() || !state?.trim() || !zip?.trim()) {
    return 'Shippo warehouse address is incomplete. Update it in Admin → Settings.';
  }
  return null;
}

/** Sync version kept for backwards-compat (env-only). */
export function shippoConfigError(): string | null {
  if (!process.env.SHIPPO_API_KEY?.trim()) {
    return 'Shippo is not configured. Add SHIPPO_API_KEY to .env.local or Admin → Settings.';
  }
  const required = [
    ['SHIPPO_FROM_NAME', process.env.SHIPPO_FROM_NAME],
    ['SHIPPO_FROM_STREET1', process.env.SHIPPO_FROM_STREET1],
    ['SHIPPO_FROM_CITY', process.env.SHIPPO_FROM_CITY],
    ['SHIPPO_FROM_STATE', process.env.SHIPPO_FROM_STATE],
    ['SHIPPO_FROM_ZIP', process.env.SHIPPO_FROM_ZIP],
  ] as const;

  for (const [name, value] of required) {
    if (!value?.trim()) {
      return `Shippo warehouse address incomplete. Set ${name} in environment variables or Admin → Settings.`;
    }
  }
  return null;
}

/** Async — reads from DB first, then env vars. Use in server API routes. */
export async function resolveShippoFromAddress(): Promise<ShippoAddress> {
  const [name, street1, street2, city, state, zip, country, phone, email] = await Promise.all([
    getSetting('shippo', 'from_name'),
    getSetting('shippo', 'from_street1'),
    getSetting('shippo', 'from_street2'),
    getSetting('shippo', 'from_city'),
    getSetting('shippo', 'from_state'),
    getSetting('shippo', 'from_zip'),
    getSetting('shippo', 'from_country'),
    getSetting('shippo', 'from_phone'),
    getSetting('shippo', 'from_email'),
  ]);

  return {
    name: name || process.env.SHIPPO_FROM_NAME || 'Himalayan Koh',
    street1: street1 || process.env.SHIPPO_FROM_STREET1 || '',
    street2: street2 || process.env.SHIPPO_FROM_STREET2 || undefined,
    city: city || process.env.SHIPPO_FROM_CITY || '',
    state: state || process.env.SHIPPO_FROM_STATE || '',
    zip: zip || process.env.SHIPPO_FROM_ZIP || '',
    country: normalizeCountryCode(country || process.env.SHIPPO_FROM_COUNTRY || 'US'),
    phone: phone || process.env.SHIPPO_FROM_PHONE || undefined,
    email: email || process.env.SHIPPO_FROM_EMAIL || undefined,
  };
}

/** Sync version kept for backwards-compat (env-only). */
export function getShippoFromAddress(): ShippoAddress {
  return {
    name: process.env.SHIPPO_FROM_NAME || 'Himalayan Koh',
    street1: process.env.SHIPPO_FROM_STREET1 || '',
    street2: process.env.SHIPPO_FROM_STREET2 || undefined,
    city: process.env.SHIPPO_FROM_CITY || '',
    state: process.env.SHIPPO_FROM_STATE || '',
    zip: process.env.SHIPPO_FROM_ZIP || '',
    country: normalizeCountryCode(process.env.SHIPPO_FROM_COUNTRY || 'US'),
    phone: process.env.SHIPPO_FROM_PHONE || undefined,
    email: process.env.SHIPPO_FROM_EMAIL || undefined,
  };
}

export function normalizeCountryCode(country: string): string {
  const value = country.trim().toLowerCase();
  if (
    value === 'us' ||
    value === 'usa' ||
    value === 'united states' ||
    value === 'united states of america'
  ) {
    return 'US';
  }
  if (value.length === 2) return value.toUpperCase();
  return country.trim().toUpperCase().slice(0, 2);
}
