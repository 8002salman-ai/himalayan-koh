/**
 * The console's order read.
 *
 * Order records live in WooCommerce, so this route is an authenticated door onto
 * `lib/woo/orders` — the WooCommerce consumer key stays on the server, and the
 * browser receives the same `Order` shape the order screens have always rendered.
 * It replaced a Supabase read of the app's own order table, which meant the
 * console and the store could disagree about which orders existed.
 *
 * The store's own counts travel with the page (`total`, `totalPages`), so the pager
 * states how many orders the store holds rather than how many this page happens to
 * contain. The figures below it are counted from the orders actually read and say
 * how wide that read was, because a dashboard that quietly reports a sample as a
 * total is worse than one that reports nothing.
 */

import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verifyAdminRequest';
import {
  WooOrderError,
  listWooOrders,
  orderWithItemsFromWoo,
  statsFromWooOrders,
  type AppOrderStatus,
} from '@/lib/woo/orders';
import { STATS_WINDOW, pageCoversStatsWindow } from '@/lib/admin/orderStatsWindow';

export const dynamic = 'force-dynamic';

const APP_STATUSES: AppOrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = new URL(request.url).searchParams;
  const statusParam = params.get('status') || '';
  const status = APP_STATUSES.includes(statusParam as AppOrderStatus)
    ? (statusParam as AppOrderStatus)
    : undefined;

  const search = params.get('search') || undefined;
  const pageNumber = Number(params.get('page') ?? '1') || 1;
  const perPage = Number(params.get('limit') ?? '') || undefined;

  // One WooCommerce read whenever the page already is the stats window; see
  // `pageCoversStatsWindow` for why that is sound and when it is not.
  const reusesPage = pageCoversStatsWindow({
    status,
    search,
    page: pageNumber,
    perPage,
  });

  try {
    const page = await listWooOrders({ status, search, page: pageNumber, perPage });
    const statsOrders = reusesPage
      ? page.orders
      : (await listWooOrders({ perPage: STATS_WINDOW })).orders;

    return NextResponse.json({
      orders: page.orders.map(orderWithItemsFromWoo),
      count: page.total,
      totalPages: page.totalPages,
      stats: statsFromWooOrders(statsOrders),
    });
  } catch (error) {
    const status = error instanceof WooOrderError ? error.status : 502;
    const message = error instanceof Error ? error.message : 'The orders could not be read.';
    return NextResponse.json({ error: message }, { status });
  }
}
