import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getSupabaseAdmin();
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: events, error } = await supabase
      .from('site_events')
      .select('event, path, item_ids, occurred_at')
      .in('event', ['view_item', 'add_to_cart', 'wishlist_save'])
      .gte('occurred_at', since90)
      .limit(20000);

    if (error) {
      return NextResponse.json({
        stats: {},
        unavailable: error.message,
      });
    }

    const stats: Record<string, { views: number; views7d: number; views30d: number; interest: number; saved: number }> = {};

    const recordStat = (idOrSlug: string, ev: string, occurredAt: string) => {
      if (!idOrSlug) return;
      const key = idOrSlug.trim();
      if (!stats[key]) {
        stats[key] = { views: 0, views7d: 0, views30d: 0, interest: 0, saved: 0 };
      }
      const item = stats[key];
      const is7d = occurredAt >= since7;
      const is30d = occurredAt >= since30;

      if (ev === 'view_item') {
        item.views++;
        if (is7d) item.views7d++;
        if (is30d) item.views30d++;
      } else if (ev === 'add_to_cart') {
        item.interest++;
      } else if (ev === 'wishlist_save') {
        item.saved++;
      }
    };

    for (const r of events || []) {
      const occurred = (r as { occurred_at?: string }).occurred_at || '';
      const ev = (r as { event?: string }).event || '';
      const itemIds = (r as { item_ids?: unknown }).item_ids;
      const path = (r as { path?: string }).path || '';

      if (Array.isArray(itemIds)) {
        for (const it of itemIds) {
          recordStat(String(it), ev, occurred);
        }
      }
      if (path) {
        const m = path.match(/\/product\/([^/?#]+)/);
        if (m) recordStat(decodeURIComponent(m[1]), ev, occurred);
      }
    }

    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({
      stats: {},
      unavailable: err instanceof Error ? err.message : 'Analytics service unavailable',
    });
  }
}
