import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { dispatchOrderShippedNotifications } from '@/lib/orders/notifyOrderEvents';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import { shippoConfigError } from '@/lib/shippo/config';
import { purchaseShippoLabel } from '@/lib/shippo/server/labels';
import { fetchShippoRatesForOrder, pickRateForShippingMethod } from '@/lib/shippo/server/rates';
import type { CheckoutShippingAddress } from '@/lib/shippo/types';

interface OrderRow {
  id: string;
  email: string;
  order_number: string;
  shipping_address: CheckoutShippingAddress;
  billing_address: { shippingMethod?: string } | null;
  shippo_rate_id: string | null;
  tracking_number: string | null;
  order_items: { quantity: number; product_id: string }[];
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
        order_items(quantity, product_id)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const row = order as unknown as OrderRow;
    if (row.tracking_number) {
      return NextResponse.json({
        ok: true,
        alreadyCreated: true,
        trackingNumber: row.tracking_number,
      });
    }

    const shippingAddress = row.shipping_address;
    const productIds = row.order_items.map((item) => item.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, weight, weight_unit')
      .in('id', productIds);

    const weightByProduct = new Map(
      (products || []).map((product) => {
        const p = product as { id: string; weight: number | null; weight_unit: string | null };
        const lbs = p.weight_unit === 'kg' && p.weight ? p.weight * 2.20462 : p.weight || undefined;
        return [p.id, lbs];
      })
    );

    const lineItems = row.order_items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      weightLbs: weightByProduct.get(item.product_id),
    }));

    const shippingMethod =
      row.billing_address?.shippingMethod === 'expedited' ? 'expedited' : 'standard';

    let rateId = row.shippo_rate_id;
    if (!rateId) {
      const rates = await fetchShippoRatesForOrder({
        email: row.email,
        shippingAddress,
        lineItems,
      });
      const picked = pickRateForShippingMethod(rates, shippingMethod);
      if (!picked) {
        return NextResponse.json({ error: 'No Shippo rates available for this order.' }, { status: 502 });
      }
      rateId = picked.objectId;
    }

    const label = await purchaseShippoLabel(rateId, row.id);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: label.trackingNumber,
        shippo_transaction_id: label.transactionId,
        shippo_rate_id: rateId,
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
    });
  } catch (error) {
    console.error('Shippo label creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create shipping label.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
