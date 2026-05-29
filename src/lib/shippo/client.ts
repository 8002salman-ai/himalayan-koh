import type { CheckoutShippingAddress, RatesLineItem, ShippoRate } from './types';

export interface AddressValidationResponse {
  configured: boolean;
  isValid: boolean;
  messages: string[];
  normalizedAddress: CheckoutShippingAddress;
  recommendedAddress?: CheckoutShippingAddress;
  source: 'shippo' | 'basic';
}

export async function validateShippingAddressClient(params: {
  address: CheckoutShippingAddress;
  email?: string;
}): Promise<AddressValidationResponse> {
  const response = await fetch('/api/shippo/validate-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: params.address,
      email: params.email,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Unable to validate shipping address.');
  }

  return body as AddressValidationResponse;
}

export async function fetchShippoRates(params: {
  address: CheckoutShippingAddress;
  email?: string;
  items: RatesLineItem[];
}): Promise<{ configured: boolean; rates: ShippoRate[] }> {
  const response = await fetch('/api/shippo/rates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: params.address,
      email: params.email,
      items: params.items,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 422 && body.unsupportedProducts) {
      throw new Error(body.error || 'Live carrier rates are not available for one or more items.');
    }
    throw new Error(body.error || 'Unable to fetch shipping rates.');
  }

  return {
    configured: Boolean(body.configured),
    rates: Array.isArray(body.rates) ? body.rates : [],
  };
}

export async function createShippoLabel(orderId: string, accessToken: string) {
  const response = await fetch('/api/shippo/create-label', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Unable to create Shippo label.');
  }
  return body as {
    ok: boolean;
    trackingNumber?: string;
    labelUrl?: string;
    carrier?: string;
    serviceName?: string;
    alreadyCreated?: boolean;
  };
}
