import { NextResponse } from 'next/server';
import { shippoConfigError } from '@/lib/shippo/config';
import { fetchShippoRates } from '@/lib/shippo/server/rates';
import type { CheckoutShippingAddress, RatesLineItem } from '@/lib/shippo/types';

function parseAddress(body: Record<string, unknown>): CheckoutShippingAddress | null {
  const address = body.address as Record<string, unknown> | undefined;
  if (!address) return null;

  const fullName = typeof address.fullName === 'string' ? address.fullName.trim() : '';
  const addressLine1 = typeof address.addressLine1 === 'string' ? address.addressLine1.trim() : '';
  const city = typeof address.city === 'string' ? address.city.trim() : '';
  const state = typeof address.state === 'string' ? address.state.trim() : '';
  const postalCode = typeof address.postalCode === 'string' ? address.postalCode.trim() : '';
  const country = typeof address.country === 'string' ? address.country.trim() : 'US';

  if (!fullName || !addressLine1 || !city || !state || !postalCode) {
    return null;
  }

  return {
    fullName,
    addressLine1,
    addressLine2: typeof address.addressLine2 === 'string' ? address.addressLine2.trim() : undefined,
    city,
    state,
    postalCode,
    country,
  };
}

function parseLineItems(body: Record<string, unknown>): RatesLineItem[] {
  const items = Array.isArray(body.items) ? body.items : [];
  return items
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        productId: typeof row.productId === 'string' ? row.productId : undefined,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 0)),
        weightLbs: Number(row.weightLbs) > 0 ? Number(row.weightLbs) : undefined,
      };
    })
    .filter((item) => item.quantity > 0);
}

export async function POST(request: Request) {
  const configError = shippoConfigError();
  if (configError) {
    return NextResponse.json({ error: configError, configured: false }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const address = parseAddress(record);
  if (!address) {
    return NextResponse.json(
      { error: 'Complete shipping address is required (name, street, city, state, postal code).' },
      { status: 400 }
    );
  }

  const lineItems = parseLineItems(record);
  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'At least one cart item is required.' }, { status: 400 });
  }

  const email = typeof record.email === 'string' ? record.email.trim() : undefined;

  try {
    const rates = await fetchShippoRates({ toAddress: address, email, lineItems });
    return NextResponse.json({ configured: true, rates });
  } catch (error) {
    console.error('Shippo rates fetch failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to fetch shipping rates.';
    return NextResponse.json({ error: message, configured: true }, { status: 502 });
  }
}
