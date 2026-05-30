import { getShippoFromAddress } from '../config';
import type { CheckoutShippingAddress, RatesLineItem, ShippoRate } from '../types';
import { enrichRatesLineItems } from '../packing/enrichLineItems';
import { buildParcelsFromPackingLineItems } from '../packing/buildParcels';
import { shippoAddressPayload, toShippoAddress } from './addresses';
import { shippoRequest } from './client';
import { shippoParcelPayload } from './parcels';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

interface ShippoRateResponse {
  object_id: string;
  amount: string;
  currency: string;
  provider: string;
  servicelevel?: { name?: string; token?: string };
  estimated_days?: number | null;
  attributes?: string[];
}

interface ShippoShipmentResponse {
  rates: ShippoRateResponse[];
}

function mapRate(rate: ShippoRateResponse): ShippoRate {
  return {
    objectId: rate.object_id,
    amount: Number(rate.amount),
    currency: rate.currency || 'USD',
    provider: rate.provider,
    serviceName: rate.servicelevel?.name || rate.provider,
    estimatedDays: rate.estimated_days ?? null,
  };
}

export async function fetchShippoRates(params: {
  toAddress: CheckoutShippingAddress;
  email?: string;
  lineItems: RatesLineItem[];
}): Promise<ShippoRate[]> {
  const fromAddress = getShippoFromAddress();
  const to = toShippoAddress(params.toAddress, params.email);
  const supabase = getSupabaseAdmin();
  const packingItems = await enrichRatesLineItems(supabase, params.lineItems);
  const parcels = buildParcelsFromPackingLineItems(packingItems).map(shippoParcelPayload);

  const shipment = await shippoRequest<ShippoShipmentResponse>('/shipments/', {
    method: 'POST',
    body: {
      address_from: shippoAddressPayload(fromAddress),
      address_to: shippoAddressPayload(to),
      parcels,
      async: false,
    },
  });

  const rates = (shipment.rates || [])
    .map(mapRate)
    .filter((rate) => rate.amount > 0 && rate.currency.toUpperCase() === 'USD')
    .sort((a, b) => {
      const aUsps = /usps/i.test(a.provider) ? 0 : 1;
      const bUsps = /usps/i.test(b.provider) ? 0 : 1;
      if (aUsps !== bUsps) return aUsps - bUsps;
      return a.amount - b.amount;
    });

  return rates.slice(0, 8);
}

export async function fetchShippoRatesForOrder(params: {
  email: string;
  shippingAddress: CheckoutShippingAddress;
  lineItems: RatesLineItem[];
}): Promise<ShippoRate[]> {
  return fetchShippoRates({
    toAddress: params.shippingAddress,
    email: params.email,
    lineItems: params.lineItems,
  });
}

export function pickRateForShippingMethod(
  rates: ShippoRate[],
  shippingMethod: 'standard' | 'expedited',
  preferredRateId?: string | null
): ShippoRate | null {
  if (rates.length === 0) return null;

  if (preferredRateId) {
    const match = rates.find((rate) => rate.objectId === preferredRateId);
    if (match) return match;
  }

  if (shippingMethod === 'expedited') {
    const expedited = rates.find((rate) =>
      /priority|express|2.?day|overnight|next|3.?day/i.test(rate.serviceName)
    );
    if (expedited) return expedited;
    return rates[Math.min(1, rates.length - 1)] || rates[0];
  }

  const standard = rates.find((rate) =>
    /ground|parcel|standard|advantage|usps/i.test(`${rate.provider} ${rate.serviceName}`)
  );
  return standard || rates[0];
}

/** Pick a rate for label purchase — USPS first, then cheapest available. */
export function pickRateForLabelPurchase(
  rates: ShippoRate[],
  shippingMethod: 'standard' | 'expedited',
): ShippoRate | null {
  if (rates.length === 0) return null;

  const uspsRates = rates.filter((rate) => /usps/i.test(rate.provider));
  if (uspsRates.length > 0) {
    return pickRateForShippingMethod(uspsRates, shippingMethod);
  }

  return pickRateForShippingMethod(rates, shippingMethod);
}
