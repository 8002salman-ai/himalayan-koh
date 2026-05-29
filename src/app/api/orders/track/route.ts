import { NextResponse } from 'next/server';
import { resolveTrackingUrl } from '@/lib/orders/tracking';
import { fetchShippoTracking } from '@/lib/shippo/server/tracking';
import { shippoConfigError } from '@/lib/shippo/config';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const orderNumber = typeof record.orderNumber === 'string' ? record.orderNumber.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';

  if (!orderNumber || !email) {
    return NextResponse.json({ error: 'Order number and email are required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        email,
        status,
        payment_status,
        payment_method,
        total,
        tracking_number,
        tracking_url,
        shipping_carrier,
        shipping_service,
        shipped_at,
        created_at,
        order_items(product_name, quantity)
      `)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const row = order as {
      email: string;
      status: string;
      payment_status: string;
      payment_method: string | null;
      total: number;
      tracking_number: string | null;
      tracking_url: string | null;
      shipping_carrier: string | null;
      shipping_service: string | null;
      shipped_at: string | null;
      order_number: string;
      created_at: string;
      order_items: { product_name: string; quantity: number }[];
    };

    if (row.email.trim().toLowerCase() !== email) {
      return NextResponse.json({ error: 'Email does not match this order.' }, { status: 403 });
    }

    const trackingUrl = resolveTrackingUrl(row);
    let liveTracking: Awaited<ReturnType<typeof fetchShippoTracking>> | null = null;

    if (row.tracking_number && row.shipping_carrier && !shippoConfigError()) {
      try {
        liveTracking = await fetchShippoTracking(row.shipping_carrier, row.tracking_number);
      } catch (trackError) {
        console.warn('Shippo live tracking unavailable:', trackError);
      }
    }

    return NextResponse.json({
      order: {
        orderNumber: row.order_number,
        status: row.status,
        paymentStatus: row.payment_status,
        paymentMethod: row.payment_method,
        total: row.total,
        createdAt: row.created_at,
        shippedAt: row.shipped_at,
        carrier: row.shipping_carrier,
        service: row.shipping_service,
        trackingNumber: row.tracking_number,
        trackingUrl: liveTracking?.trackingUrl || trackingUrl,
        items: row.order_items,
      },
      tracking: liveTracking
        ? {
            status: liveTracking.status,
            statusDetails: liveTracking.statusDetails,
            events: liveTracking.events,
          }
        : null,
    });
  } catch (error) {
    console.error('Order track lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load tracking.' }, { status: 500 });
  }
}
