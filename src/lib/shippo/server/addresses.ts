import { normalizeUsState, formatUsPostalCode } from '@/lib/address/usStates';
import { normalizeCountryCode } from '../config';
import type { CheckoutShippingAddress, ShippoAddress } from '../types';

export function toShippoAddress(address: CheckoutShippingAddress, email?: string): ShippoAddress {
  const country = normalizeCountryCode(address.country);
  const state = country === 'US' ? normalizeUsState(address.state) : address.state.trim();
  const zip = country === 'US' ? formatUsPostalCode(address.postalCode) : address.postalCode.trim();

  return {
    name: address.fullName.trim(),
    street1: address.addressLine1.trim(),
    street2: address.addressLine2?.trim() || undefined,
    city: address.city.trim(),
    state,
    zip,
    country,
    email: email?.trim() || undefined,
  };
}

export function shippoAddressPayload(address: ShippoAddress) {
  return {
    name: address.name,
    street1: address.street1,
    street2: address.street2 || '',
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
    phone: address.phone || '',
    email: address.email || '',
  };
}
