import { resolveShippoFromAddress } from '../config';
import type { CheckoutShippingAddress, RatesLineItem, ShippoRate } from '../types';
import { enrichRatesLineItems } from '../packing/enrichLineItems';
import { buildConsolidatedParcelFromPackingLineItems, buildParcelsFromPackingLineItems } from '../packing/buildParcels';
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

interface ShippoShipmentMessage {
  code: string;
  source: string;
  text: string;
}

interface ShippoShipmentResponse {
  rates: ShippoRateResponse[];
  messages?: ShippoShipmentMessage[];
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
  consolidateParcels?: boolean;
}): Promise<ShippoRate[]> {
  const fromAddress = await resolveShippoFromAddress();
  const to = toShippoAddress(params.toAddress, params.email);
  const supabase = getSupabaseAdmin();
  const packingItems = await enrichRatesLineItems(supabase, params.lineItems);
  const parcelInputs = params.consolidateParcels
    ? buildConsolidatedParcelFromPackingLineItems(packingItems)
    : buildParcelsFromPackingLineItems(packingItems);
  const parcels = parcelInputs.map(shippoParcelPayload);

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

  if (rates.length === 0 && (shipment.messages?.length || (shipment.rates || []).length > 0)) {
    console.warn('[Shippo] Shipment returned no usable USD rates. Raw rate count:', (shipment.rates || []).length, 'Messages:', JSON.stringify(shipment.messages ?? []));
  }

  return rates.slice(0, 8);
}

export async function fetchShippoRatesForOrder(params: {
  email: string;
  shippingAddress: CheckoutShippingAddress;
  lineItems: RatesLineItem[];
  consolidateParcels?: boolean;
}): Promise<ShippoRate[]> {
  return fetchShippoRates({
    toAddress: params.shippingAddress,
    email: params.email,
    lineItems: params.lineItems,
    consolidateParcels: params.consolidateParcels,
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

/** Ordered rate IDs to try when purchasing a label. */
export function pickRateCandidatesForLabel(
  rates: ShippoRate[],
  shippingMethod: 'standard' | 'expedited',
): string[] {
  if (rates.length === 0) return [];

  const ids = new Set<string>();
  const add = (rate: ShippoRate | null | undefined) => {
    if (rate?.objectId) ids.add(rate.objectId);
  };

  add(pickRateForLabelPurchase(rates, shippingMethod));

  for (const rate of rates) {
    if (/usps/i.test(rate.provider)) add(rate);
  }
  for (const rate of rates) {
    if (/ground|advantage|parcel select|media mail/i.test(`${rate.provider} ${rate.serviceName}`)) {
      add(rate);
    }
  }
  for (const rate of rates) {
    add(rate);
  }

  return [...ids];
}
