import { formatUsPostalCode, isLikelyUsZip, normalizeUsState } from '@/lib/address/usStates';
import { normalizeCountryCode } from '../config';
import type { CheckoutShippingAddress } from '../types';
import { shippoAddressPayload, toShippoAddress } from './addresses';
import { shippoRequest } from './client';

export interface AddressValidationResult {
  isValid: boolean;
  messages: string[];
  normalizedAddress: CheckoutShippingAddress;
  recommendedAddress?: CheckoutShippingAddress;
  source: 'shippo' | 'basic';
}

interface ShippoAddressValidationResponse {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  validation_results?: {
    is_valid?: boolean;
    messages?: { text?: string; type?: string }[];
  };
}

function normalizeCheckoutAddress(address: CheckoutShippingAddress): CheckoutShippingAddress {
  const country = address.country.trim() || 'United States';
  const countryCode = normalizeCountryCode(country);

  return {
    fullName: address.fullName.trim(),
    addressLine1: address.addressLine1.trim(),
    addressLine2: address.addressLine2?.trim() || undefined,
    city: address.city.trim(),
    state: countryCode === 'US' ? normalizeUsState(address.state) : address.state.trim(),
    postalCode: countryCode === 'US' ? formatUsPostalCode(address.postalCode) : address.postalCode.trim(),
    country,
  };
}

function basicValidation(address: CheckoutShippingAddress): AddressValidationResult {
  const normalizedAddress = normalizeCheckoutAddress(address);
  const messages: string[] = [];
  const countryCode = normalizeCountryCode(normalizedAddress.country);

  if (countryCode === 'US') {
    if (normalizedAddress.state.length !== 2) {
      messages.push('Use a two-letter US state code (example: TX for Texas).');
    }
    if (!isLikelyUsZip(normalizedAddress.postalCode)) {
      messages.push('Enter a valid 5-digit US ZIP code.');
    }
  }

  return {
    isValid: messages.length === 0,
    messages,
    normalizedAddress,
    source: 'basic',
  };
}

export async function validateShippingAddress(
  address: CheckoutShippingAddress,
  email?: string,
): Promise<AddressValidationResult> {
  const normalizedAddress = normalizeCheckoutAddress(address);
  const basic = basicValidation(normalizedAddress);

  if (!process.env.SHIPPO_API_KEY?.trim()) {
    return basic;
  }

  try {
    const shippoAddress = toShippoAddress(normalizedAddress, email);
    const response = await shippoRequest<ShippoAddressValidationResponse>('/addresses/', {
      method: 'POST',
      body: {
        ...shippoAddressPayload(shippoAddress),
        validate: true,
      },
    });

    const messages =
      response.validation_results?.messages
        ?.map((message) => message.text?.trim())
        .filter((text): text is string => Boolean(text)) ?? [];

    const validatedAddress: CheckoutShippingAddress = {
      ...normalizedAddress,
      addressLine1: response.street1?.trim() || normalizedAddress.addressLine1,
      addressLine2: response.street2?.trim() || normalizedAddress.addressLine2,
      city: response.city?.trim() || normalizedAddress.city,
      state: response.state?.trim() || normalizedAddress.state,
      postalCode: response.zip?.trim() || normalizedAddress.postalCode,
    };

    const changed =
      validatedAddress.addressLine1 !== normalizedAddress.addressLine1 ||
      validatedAddress.city !== normalizedAddress.city ||
      validatedAddress.state !== normalizedAddress.state ||
      validatedAddress.postalCode !== normalizedAddress.postalCode;

    const isValid = Boolean(response.validation_results?.is_valid);

    return {
      isValid,
      messages: isValid ? [] : messages.length > 0 ? messages : basic.messages,
      normalizedAddress: validatedAddress,
      recommendedAddress: changed ? validatedAddress : undefined,
      source: 'shippo',
    };
  } catch (error) {
    console.error('Shippo address validation failed:', error);
    return basic;
  }
}
