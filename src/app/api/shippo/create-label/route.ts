import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { dispatchOrderShippedNotifications } from '@/lib/orders/notifyOrderEvents';
import { UnsupportedPackingProductsError } from '@/lib/shippo/packing/errors';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { shippoConfigError } from '@/lib/shippo/config';
import { formatShippoLabelError, isRetryableLabelError } from '@/lib/shippo/carrierErrors';
import { normalizeOrderShippingAddress } from '@/lib/shippo/normalizeAddress';
import { purchaseShippoLabel } from '@/lib/shippo/server/labels';
import {
  fetchShippoRatesForOrder,
  pickRateCandidatesForLabel,
} from '@/lib/shippo/server/rates';
import type { CheckoutShippingAddress, RatesLineItem } from '@/lib/shippo/types';

interface OrderRow {
  id: string;
  email: string;
  order_number: string;
  shipping_address: CheckoutShippingAddress;
  billing_address: { shippingMethod?: string } | null;
  shippo_rate_id: string | null;
  tracking_number: string | null;
  label_url: string | null;
  order_items: { quantity: number; product_id: string }[] | null;
}

function buildOrderLineItems(orderItems: OrderRow['order_items']): RatesLineItem[] {
  if (!Array.isArray(orderItems)) return [];

  return orderItems
    .map((item) => ({
      productId: typeof item.product_id === 'string' ? item.product_id : '',
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
    }))
    .filter((item) => item.productId && item.quantity > 0);
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const configError = shippoConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const orderId = typeof record.orderId === 'string' ? record.orderId.trim() : '';

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        email,
        order_number,
        shipping_address,
        billing_address,
        shippo_rate_id,
        tracking_number,
        label_url,
        order_items(quantity, product_id)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const row = order as unknown as OrderRow;
    if (row.tracking_number && row.label_url) {
      return NextResponse.json({
        ok: true,
        alreadyCreated: true,
        trackingNumber: row.tracking_number,
        labelUrl: row.label_url,
      });
    }

    const shippingAddress = normalizeOrderShippingAddress(row.shipping_address);
    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Order shipping address is incomplete. Update the order address before creating a label.' },
        { status: 422 },
      );
    }

    const lineItems = buildOrderLineItems(row.order_items);
    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Order has no shippable line items. Check order items in the database.' },
        { status: 422 },
      );
    }

    const shippingMethod =
      row.billing_address?.shippingMethod === 'expedited' ? 'expedited' : 'standard';

    const consolidateParcels = lineItems.length > 1;
    let rates = await fetchShippoRatesForOrder({
      email: row.email,
      shippingAddress,
      lineItems,
      consolidateParcels,
    });

    if (rates.length === 0 && consolidateParcels) {
      rates = await fetchShippoRatesForOrder({
        email: row.email,
        shippingAddress,
        lineItems,
        consolidateParcels: false,
      });
    }

    if (rates.length === 0) {
      return NextResponse.json(
        {
          error:
            'No Shippo rates available for this order. Confirm the shipping address and product weights, then try again.',
        },
        { status: 502 },
      );
    }

    const candidates = pickRateCandidatesForLabel(rates, shippingMethod);
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No Shippo rates available for this order.' }, { status: 502 });
    }

    let label = null;
    let usedRateId: string | null = null;
    let lastError: Error | null = null;

    for (let index = 0; index < candidates.length; index += 1) {
      const rateId = candidates[index];
      try {
        label = await purchaseShippoLabel(rateId, row.id);
        usedRateId = rateId;
        break;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unable to create shipping label.');
        lastError = error;
        const canRetry = index < candidates.length - 1 && isRetryableLabelError(error.message);
        if (!canRetry) break;
      }
    }

    if (!label || !usedRateId) {
      throw lastError ?? new Error('Unable to create shipping label.');
    }

    const pickedRate = rates.find((rate) => rate.objectId === usedRateId);
    const usedFallback = usedRateId !== row.shippo_rate_id;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: label.trackingNumber,
        shippo_transaction_id: label.transactionId,
        shippo_rate_id: usedRateId,
        shipping_carrier: label.carrier,
        shipping_service: label.serviceName,
        label_url: label.labelUrl,
        tracking_url: label.trackingUrl,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', row.id);

    if (updateError) throw updateError;

    dispatchOrderShippedNotifications(row.id);

    return NextResponse.json({
      ok: true,
      orderId: row.id,
      orderNumber: row.order_number,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrl,
      labelUrl: label.labelUrl,
      carrier: label.carrier,
      serviceName: label.serviceName,
      usedFallbackCarrier: usedFallback,
      checkoutCarrier: pickedRate?.provider ?? null,
      consolidatedParcel: consolidateParcels,
    });
  } catch (error) {
    if (error instanceof UnsupportedPackingProductsError) {
      return NextResponse.json(
        {
          error: `${error.message} Update the cart or add a packing rule before creating a label.`,
          unsupportedProducts: true,
          products: error.products,
        },
        { status: 422 },
      );
    }
    console.error('Shippo label creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create shipping label.';
    return NextResponse.json(
      { error: message, carrierError: formatShippoLabelError(message) },
      { status: 502 },
    );
  }
}
