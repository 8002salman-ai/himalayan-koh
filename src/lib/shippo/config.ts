import type { ShippoAddress } from './types';

export function isShippoConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY?.trim());
}

export function shippoConfigError(): string | null {
  if (!process.env.SHIPPO_API_KEY?.trim()) {
    return 'Shippo is not configured. Add SHIPPO_API_KEY to .env.local or Vercel.';
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
      return `Shippo warehouse address incomplete. Set ${name} in environment variables.`;
    }
  }
  return null;
}

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

/** Client-safe flag — only checks if server has Shippo (via public env hint). */
export function isShippoEnabledOnClient(): boolean {
  return process.env.NEXT_PUBLIC_SHIPPO_ENABLED === 'true';
}

export function normalizeCountryCode(country: string): string {
  const value = country.trim().toLowerCase();
  if (value === 'us' || value === 'usa' || value === 'united states' || value === 'united states of america') {
    return 'US';
  }
  if (value.length === 2) return value.toUpperCase();
  return country.trim().toUpperCase().slice(0, 2);
}
