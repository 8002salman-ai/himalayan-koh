import { formatUsPostalCode, normalizeUsState } from '@/lib/address/usStates';
import { normalizeCountryCode } from './config';
import type { CheckoutShippingAddress } from './types';

/** Normalize order JSON addresses before Shippo API calls. */
export function normalizeOrderShippingAddress(
  value: unknown,
): CheckoutShippingAddress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const fullName =
    (typeof row.fullName === 'string' ? row.fullName : typeof row.name === 'string' ? row.name : '')
      .trim();
  const addressLine1 =
    (typeof row.addressLine1 === 'string'
      ? row.addressLine1
      : typeof row.street1 === 'string'
        ? row.street1
        : typeof row.address === 'string'
          ? row.address
          : ''
    ).trim();
  const city = (typeof row.city === 'string' ? row.city : '').trim();
  const stateRaw = (typeof row.state === 'string' ? row.state : '').trim();
  const postalCodeRaw =
    (typeof row.postalCode === 'string'
      ? row.postalCode
      : typeof row.zip === 'string'
        ? row.zip
        : typeof row.postal_code === 'string'
          ? row.postal_code
          : ''
    ).trim();
  const countryRaw =
    (typeof row.country === 'string' ? row.country : 'US').trim() || 'US';

  if (!fullName || !addressLine1 || !city || !stateRaw || !postalCodeRaw) {
    return null;
  }

  const country = normalizeCountryCode(countryRaw);
  const state = country === 'US' ? normalizeUsState(stateRaw) : stateRaw;
  const postalCode = country === 'US' ? formatUsPostalCode(postalCodeRaw) : postalCodeRaw;

  return {
    fullName,
    addressLine1,
    addressLine2:
      typeof row.addressLine2 === 'string'
        ? row.addressLine2.trim() || undefined
        : typeof row.street2 === 'string'
          ? row.street2.trim() || undefined
          : undefined,
    city,
    state,
    postalCode,
    country: countryRaw,
  };
}
