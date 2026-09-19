import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSetting, upsertSettings } from '@/lib/settings/serverSettings';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

const CATEGORY = 'campaigns';
const KEY = 'gift_drop_campaign_v1';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let campaign = null;
  try {
    const raw = await getSetting(CATEGORY, KEY);
    if (raw) {
      campaign = JSON.parse(raw);
    }
  } catch {
    campaign = null;
  }

  // Load claims from database if table exists, otherwise return clean empty list
  let claims: unknown[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = getSupabaseAdmin();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_number', '%GIFT%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (Array.isArray(data)) {
      claims = data.map((o) => ({
        id: o.id,
        orderNumber: o.order_number || String(o.id).slice(0, 8),
        email: o.email || o.customer_email || '—',
        name: o.shipping_name || o.customer_name || 'Recipient',
        status: o.status || 'pending',
        createdAt: o.created_at,
        address: {
          line1: o.shipping_address_line1 || o.address_line1 || '',
          city: o.shipping_city || o.city || '',
          state: o.shipping_state || o.state || '',
          zip: o.shipping_postal_code || o.postal_code || '',
        },
        giftName: o.items?.[0]?.name || campaign?.giftName || 'Promotional Gift Drop',
        payment: 'Free ($0.00)',
        isTest: Boolean(o.is_test),
        tracking: o.tracking_number ? { carrier: o.carrier || 'USPS', number: o.tracking_number } : null,
        totalCents: 0,
      }));
    }
  } catch {
    claims = [];
  }

  const total = campaign?.totalQuantity ?? 100;
  const claimed = claims.length;
  const remaining = Math.max(0, total - claimed);

  return NextResponse.json({
    campaign,
    claims,
    stats: {
      total,
      claimed,
      remaining,
    },
  });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = String(body.action || '');

  if (action === 'campaign') {
    const campaignData = {
      title: String(body.title || 'Himalayan Koh Gift Drop'),
      message: String(body.message || ''),
      giftName: String(body.giftName || 'Himalayan Pink Salt Sample'),
      giftValueCents: Number(body.giftValueCents) || 0,
      totalQuantity: Math.max(0, Number(body.totalQuantity) || 100),
      active: Boolean(body.active),
      startsAt: body.startsAt ? String(body.startsAt) : new Date().toISOString(),
      endsAt: body.endsAt ? String(body.endsAt) : null,
    };

    try {
      await upsertSettings(CATEGORY, { [KEY]: JSON.stringify(campaignData) });
      return NextResponse.json({ ok: true, campaign: campaignData });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Could not save campaign configuration.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
