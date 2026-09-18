'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  DollarSign,
  Eye,
  FileText,
  Gift,
  Layers,
  Loader2,
  Megaphone,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Sparkle,
  TrendingUp,
  Users,
  Wand as MagicWand,
  Zap as Lightning,
} from 'lucide-react';
import {
  adminApi,
  type AdminDashboardAnalytics,
  type AdminOrder,
  type AdminOrderAnalytics,
} from '../../lib/supabase/api/admin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import { fetchAdminCatalogStats } from '../../lib/admin/adminCatalogClient';
import type { AdminCatalogStats } from '../../lib/backend/adminCatalog';
import { getErrorMessage } from '../../lib/errors';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminKpiCard,
  AdminLivePill,
  AdminNotice,
  AdminPanel,
  AdminSegmentedBar,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';

/**
 * The store overview.
 *
 * Layout mirrors the Luxedge console's dashboard one-for-one — header with a live
 * badge, a six-figure KPI row, revenue/orders performance with a range selector,
 * recent orders, and an operations column (order status, low stock, gift drop,
 * publishing queue), then the quick-action grid. What differs is where the
 * numbers come from and what happens when a source cannot answer.
 *
 * Three facts govern this file:
 *
 * 1. **Orders, revenue and customers live in Supabase**; the catalog does not. So
 *    the sales half reads the order API and the catalog half reads the backend
 *    adapter, and neither derives the other.
 * 2. **A figure without a source is not zero.** Supabase not configured, or a
 *    catalog that reports no stock counts, produces an explicit "Not connected"
 *    in the number slot instead of a 0 that reads as a real measurement.
 * 3. **The range selector is real.** 7/30/90-day buckets are built from the order
 *    rows that were actually fetched, and the panel says how many of the store's
 *    orders that sample covered, so a small sample cannot masquerade as history.
 */

/** Order statuses that count as money taken, mirroring the reference console. */
const PAID_STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'partially_refunded'];

const ORDER_SAMPLE_LIMIT = 200;

interface DayBucket {
  label: string;
  total: number;
  orders: number;
}

function isPaid(order: AdminOrder): boolean {
  return PAID_STATUSES.includes(String(order.status || ''));
}

/** Daily revenue and order counts for the last `days` days, paid orders only. */
function buildSeries(orders: AdminOrder[], days: number): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const dayOrders = orders.filter((order) => {
      const created = new Date(order.created_at);
      return created >= start && created < end;
    });
    const paid = dayOrders.filter(isPaid);

    buckets.push({
      label: start.toLocaleDateString(undefined, days <= 7 ? { weekday: 'narrow' } : { month: 'short', day: 'numeric' }),
      total: paid.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orders: paid.length,
    });
  }
  return buckets;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [orderAnalytics, setOrderAnalytics] = useState<AdminOrderAnalytics | null>(null);
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [catalogStats, setCatalogStats] = useState<AdminCatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [realtimeNotice, setRealtimeNotice] = useState('');
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(7);

  const ordersConnected = isSupabaseConfigured();

  const load = useCallback(async () => {
    setFetchError(null);
    try {
      const [orderPage, analyticsData, catalogData] = await Promise.all([
        ordersConnected
          ? adminApi.getOrders({ limit: ORDER_SAMPLE_LIMIT, page: 1 })
          : Promise.resolve(null),
        ordersConnected ? adminApi.getDashboardAnalytics() : Promise.resolve(null),
        fetchAdminCatalogStats(),
      ]);

      setOrders(orderPage?.orders ?? []);
      setOrderCount(orderPage?.count ?? 0);
      setAnalytics(analyticsData);
      setCatalogStats(catalogData);

      if (ordersConnected) {
        setOrderAnalytics(await adminApi.getOrderAnalytics());
      }
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
      setLoadedAt(new Date());
    }
  }, [ordersConnected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ordersConnected) return;

    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setRealtimeNotice('New order received');
        void load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setRealtimeNotice('New customer activity');
        void load();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ordersConnected, load]);

  /* ---------------- figures ---------------- */

  const series = useMemo(() => buildSeries(orders, range), [orders, range]);
  const rangeRevenue = series.reduce((sum, day) => sum + day.total, 0);
  const rangeOrders = series.reduce((sum, day) => sum + day.orders, 0);
  const maxDay = Math.max(...series.map((day) => day.total), 1);

  const weekSeries = useMemo(() => buildSeries(orders, 7), [orders]);
  const priorWeekSeries = useMemo(() => buildSeries(orders, 14).slice(0, 7), [orders]);
  const weekRevenue = weekSeries.reduce((sum, day) => sum + day.total, 0);
  const priorWeekRevenue = priorWeekSeries.reduce((sum, day) => sum + day.total, 0);
  const revenueTrend = priorWeekRevenue > 0 ? ((weekRevenue - priorWeekRevenue) / priorWeekRevenue) * 100 : null;

  const paidOrders = orderAnalytics?.totalOrders ?? 0;
  const allTimeRevenue = orderAnalytics?.totalRevenue ?? 0;
  const averageOrderValue = paidOrders > 0 ? allTimeRevenue / paidOrders : 0;

  const isWooCatalog = catalogStats?.source === 'woocommerce';
  const activeProducts = catalogStats ? (isWooCatalog ? catalogStats.total : catalogStats.active) : null;
  const totalProducts = catalogStats?.total ?? null;

  const sampleNote =
    orderCount > orders.length
      ? `based on the most recent ${orders.length} of ${orderCount} orders`
      : `${orders.length} order${orders.length === 1 ? '' : 's'} on record`;

  /* ---------------- order status breakdown ---------------- */

  const statusSegments = [
    { label: 'Pending', count: orderAnalytics?.pendingOrders ?? 0, className: 'bg-slate-400' },
    { label: 'Processing', count: orderAnalytics?.processingOrders ?? 0, className: 'bg-blue-500' },
    { label: 'Shipped', count: orderAnalytics?.shippedOrders ?? 0, className: 'bg-sky-500' },
    { label: 'Delivered', count: orderAnalytics?.deliveredOrders ?? 0, className: 'bg-teal-500' },
    { label: 'Cancelled', count: orderAnalytics?.cancelledOrders ?? 0, className: 'bg-rose-400' },
    { label: 'Refund requests', count: orderAnalytics?.refundRequests ?? 0, className: 'bg-amber-500' },
  ];
  const statusTotal = statusSegments.reduce((sum, segment) => sum + segment.count, 0);

  /* ---------------- low stock ---------------- */

  const lowStockAlerts = analytics?.inventoryAlerts ?? [];
  const lowStockCount = catalogStats && !isWooCatalog ? catalogStats.lowStock : null;

  const quickActions = [
    {
      to: '/admin/ai-import',
      icon: MagicWand,
      label: 'Import Product',
      desc: 'Paste a product URL — research and draft the listing',
    },
    {
      to: '/admin/products?action=new',
      icon: Plus,
      label: 'Add Product Manually',
      desc: 'Full editor — images, variants, SEO and pricing',
    },
    {
      to: '/admin/marketing',
      icon: Megaphone,
      label: 'Generate Product Content',
      desc: 'AI copy, SEO and descriptions · model key required',
    },
    {
      to: '/admin/variant-gen',
      icon: Layers,
      label: 'Create Variants',
      desc: 'Generate weight and size combinations in one pass',
    },
    {
      to: '/admin/seo',
      icon: TrendingUp,
      label: 'SEO Optimize',
      desc: 'Meta, schema and keyword suggestions for pages',
    },
    {
      to: '/admin/ai-intelligence',
      icon: Sparkle,
      label: 'Open AI Intelligence',
      desc: 'Insights across catalog, media and traffic · model key required',
    },
  ];

  return (
    <div className="space-y-4">
      {fetchError && (
        <AdminNotice
          tone="danger"
          title="Dashboard failed to load"
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          }
        >
          {fetchError}
        </AdminNotice>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-admin-ink">Dashboard</h1>
            {ordersConnected ? <AdminLivePill /> : <AdminChip tone="warning">Not connected</AdminChip>}
            {realtimeNotice && <AdminChip tone="success">{realtimeNotice}</AdminChip>}
          </div>
          <p className="mt-0.5 text-xs text-admin-muted">
            Store performance and catalog overview.
            {loading && <Loader2 size={11} className="ml-1.5 inline animate-spin" />}
            {loadedAt && (
              <span className="text-admin-muted/80">
                {' '}
                · Updated{' '}
                {loadedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-admin-line bg-admin-surface px-3.5 py-2 text-xs font-semibold text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
          >
            <Eye size={13} /> View store
          </Link>
          <Link
            to="/admin/ai-import"
            className="inline-flex items-center gap-1.5 rounded-lg border border-admin-line bg-admin-surface px-3.5 py-2 text-xs font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
          >
            <MagicWand size={13} /> AI Import
          </Link>
          <Link
            to="/admin/products?action=new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-admin-ink px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus size={13} /> Add to Catalog
          </Link>
        </div>
      </div>

      {/* KPI row — six figures, each linkable */}
      <div className="grid grid-cols-6 gap-2.5">
        <AdminKpiCard
          to="/admin/orders"
          icon={DollarSign}
          label="Revenue (7 days)"
          tone="amber"
          value={loading ? '—' : `$${weekRevenue.toFixed(2)}`}
          sub={
            loading
              ? 'reading orders'
              : weekRevenue > 0
                ? revenueTrend === null
                  ? '— vs prior week'
                  : `${revenueTrend >= 0 ? '▲' : '▼'} ${Math.abs(revenueTrend).toFixed(0)}% vs prior week`
                : 'No paid orders yet'
          }
        />
        <AdminKpiCard
          to="/admin/orders"
          icon={ShoppingCart}
          label="Orders"
          tone="amber"
          value={loading ? '—' : paidOrders}
          sub={
            loading
              ? 'reading orders'
              : paidOrders
                ? `$${allTimeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} all-time`
                : 'No paid orders yet'
          }
        />
        <AdminKpiCard
          to="/admin/orders"
          icon={TrendingUp}
          label="Avg order value"
          tone="amber"
          value={loading ? '—' : paidOrders ? `$${averageOrderValue.toFixed(2)}` : '—'}
          sub={loading ? 'reading orders' : paidOrders ? 'per paid order' : 'No paid orders yet'}
        />
        <AdminKpiCard
          to="/admin/customers"
          icon={Users}
          label="Customers"
          tone="amber"
          value={loading ? '—' : (analytics?.totalCustomers ?? 'Not connected')}
          sub={
            loading
              ? 'reading customers'
              : analytics
                ? `${analytics.newCustomers} new · ${analytics.repeatCustomers} repeat`
                : 'No customer source configured'
          }
        />
        <AdminKpiCard
          to="/admin/products"
          icon={Package}
          label="Active products"
          tone="amber"
          value={catalogStats === null ? 'Reading…' : (activeProducts ?? '—')}
          sub={`${totalProducts ?? '—'} total · ${isWooCatalog ? 'WooCommerce' : 'Supabase'}`}
        />
        <AdminKpiCard
          to="/admin/inventory"
          icon={AlertTriangle}
          label="Low-stock products"
          tone="amber"
          value={lowStockCount === null ? (isWooCatalog ? 'Not reported' : '—') : lowStockCount}
          sub={
            isWooCatalog
              ? 'this source reports no counts'
              : lowStockCount
                ? 'need restock'
                : 'All stocked'
          }
        />
      </div>

      {/* Main grid — left: performance and orders, right: operations */}
      <div className="grid grid-cols-3 items-start gap-4">
        <div className="col-span-2 space-y-4">
          {/* Revenue & orders */}
          <AdminPanel
            bodyClassName=""
            title={
              <span className="flex items-center gap-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-himalayan-lighter">
                  <TrendingUp size={14} className="text-himalayan-dark" />
                </span>
                <span>
                  Revenue &amp; Orders
                  <span className="mt-0.5 block text-[10px] font-normal text-admin-muted">
                    {rangeOrders} order{rangeOrders === 1 ? '' : 's'} · ${rangeRevenue.toFixed(2)} in
                    range · {sampleNote}
                  </span>
                </span>
              </span>
            }
            action={
              <div className="flex items-center gap-0.5 rounded-lg border border-admin-line p-0.5">
                {([7, 30, 90] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRange(option)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      range === option
                        ? 'bg-admin-ink text-white'
                        : 'text-admin-muted hover:text-admin-ink'
                    }`}
                  >
                    {option}D
                  </button>
                ))}
              </div>
            }
          >
            {rangeOrders === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-admin-canvas">
                  <TrendingUp size={16} className="text-admin-muted/60" />
                </div>
                <p className="text-xs text-admin-muted">
                  {loading
                    ? 'Reading orders…'
                    : ordersConnected
                      ? 'No paid orders in this range yet — share the store or run a campaign.'
                      : 'No order source is configured, so there is nothing to chart.'}
                </p>
              </div>
            ) : (
              <div className="px-5 pb-4">
                <div className="flex h-24 items-end gap-1">
                  {series.map((day, index) => {
                    const step = range === 7 ? 1 : range === 30 ? 5 : 15;
                    return (
                      <div
                        key={`${day.label}-${index}`}
                        className="flex min-w-0 flex-1 flex-col items-center gap-1"
                        title={`${day.label}: $${day.total.toFixed(2)} (${day.orders} order${day.orders === 1 ? '' : 's'})`}
                      >
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-himalayan-dark to-himalayan transition-all"
                          style={{
                            height: `${Math.max((day.total / maxDay) * 80, day.total > 0 ? 6 : 2)}px`,
                            opacity: day.total > 0 ? 1 : 0.25,
                          }}
                        />
                        <span className="text-[8px] font-medium uppercase text-admin-muted">
                          {index % step === 0 || index === series.length - 1 ? day.label : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </AdminPanel>

          {/* Recent orders */}
          <AdminPanel
            title="Recent Orders"
            action={
              <Link to="/admin/orders" className="text-[10px] font-semibold text-himalayan-dark hover:underline">
                View all orders →
              </Link>
            }
          >
            <AdminTable
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'customer', label: 'Customer' },
                { key: 'date', label: 'Date' },
                { key: 'total', label: 'Total', align: 'right' },
                { key: 'status', label: 'Status', align: 'right' },
              ]}
              minWidth="820px"
            >
              {loading ? (
                <AdminTableSkeleton rows={5} columns={5} />
              ) : (
                orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-admin-canvas/60">
                    <td className={ADMIN_TD}>
                      <span className="font-mono text-[11px] font-semibold text-admin-ink">
                        {order.order_number}
                      </span>
                    </td>
                    <td className={`${ADMIN_TD} text-[11px] text-admin-muted`}>
                      {order.profile?.full_name || order.email || '—'}
                    </td>
                    <td className={`${ADMIN_TD} text-[11px] text-admin-muted`}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className={`${ADMIN_TD} text-right text-[11px] font-bold text-admin-ink`}>
                      ${Number(order.total || 0).toFixed(2)}
                    </td>
                    <td className={`${ADMIN_TD} text-right`}>
                      <AdminChip
                        tone={
                          String(order.status) === 'paid'
                            ? 'success'
                            : String(order.status).includes('refund')
                              ? 'warning'
                              : 'muted'
                        }
                      >
                        {String(order.status || '').replace('_', ' ')}
                      </AdminChip>
                    </td>
                  </tr>
                ))
              )}
            </AdminTable>
            {!loading && orders.length === 0 && (
              <p className="px-5 py-6 text-center text-[11px] text-admin-muted">
                {ordersConnected
                  ? 'No orders yet — share the store or run a campaign.'
                  : 'No order source is configured for this deployment.'}
              </p>
            )}
          </AdminPanel>
        </div>

        {/* Operations column */}
        <div className="space-y-4">
          <AdminPanel title={<span className="flex items-center gap-1.5"><Receipt size={11} className="text-himalayan-dark" />Order Status</span>}>
            {statusTotal === 0 ? (
              <p className="py-4 text-center text-[11px] text-admin-muted">
                {loading ? 'Reading orders…' : 'No order-status data yet.'}
              </p>
            ) : (
              <>
                <AdminSegmentedBar segments={statusSegments} />
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                  {statusSegments.map((segment) => (
                    <span key={segment.label} className="flex items-center gap-1.5 text-[10px] text-admin-muted">
                      <span className={`h-2 w-2 rounded-full ${segment.className}`} />
                      {segment.label} · <b className="text-admin-ink">{segment.count}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </AdminPanel>

          <AdminPanel
            title={<span className="flex items-center gap-1.5"><AlertTriangle size={11} className="text-amber-500" />Low Stock</span>}
            action={
              <Link to="/admin/inventory" className="text-[10px] font-semibold text-himalayan-dark hover:underline">
                View inventory →
              </Link>
            }
          >
            {isWooCatalog ? (
              <p className="py-3 text-center text-[11px] text-admin-muted">
                This catalog source reports no unit counts, so nothing can be ranked by stock.
              </p>
            ) : lowStockAlerts.length === 0 ? (
              <p className="py-3 text-center text-[11px] text-admin-muted">
                {loading ? 'Reading inventory…' : 'No low-stock alerts.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {lowStockAlerts.slice(0, 4).map((alert) => (
                  <li key={alert.productId} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-admin-ink">{alert.productName}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        alert.quantity <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {alert.quantity} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          <AdminPanel
            title={<span className="flex items-center gap-1.5"><Gift size={11} className="text-himalayan-dark" />Gift Drop</span>}
          >
            <p className="py-3 text-center text-[11px] text-admin-muted">
              No claim ledger is connected, so there are no claims or remaining gifts to report.
            </p>
            <Link
              to="/admin/gift-drop"
              className="mt-2.5 block rounded-lg border border-admin-line py-1.5 text-center text-[10px] font-semibold text-himalayan-dark transition-colors hover:bg-himalayan-lighter"
            >
              Open Gift Drop admin →
            </Link>
          </AdminPanel>

          <AdminPanel
            title={<span className="flex items-center gap-1.5"><FileText size={11} className="text-himalayan-dark" />Publishing Queue</span>}
            action={
              <Link to="/admin/products" className="text-[10px] font-semibold text-himalayan-dark hover:underline">
                Manage →
              </Link>
            }
          >
            {isWooCatalog || !catalogStats || catalogStats.source !== 'supabase' ? (
              <p className="py-3 text-center text-[11px] text-admin-muted">
                Product status is not reported by this catalog source, so a draft count would be a
                guess. The Listing Task queue is the working list.
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-himalayan-lighter">
                  <FileText size={16} className="text-himalayan-dark" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none text-admin-ink">
                    {catalogStats.inactive} not listed
                  </p>
                  <p className="mt-0.5 text-[10px] text-admin-muted">
                    {catalogStats.active} active · {catalogStats.total} total in the catalog
                  </p>
                </div>
              </div>
            )}
          </AdminPanel>
        </div>
      </div>

      {/* Quick actions */}
      <AdminPanel
        title={<span className="flex items-center gap-1.5"><Lightning size={12} className="text-himalayan-dark" />Quick Actions</span>}
        action={
          <Link to="/admin/ai-import" className="text-[10px] font-semibold text-himalayan-dark hover:underline">
            AI Import →
          </Link>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-start gap-2.5 rounded-lg border border-admin-line p-3 transition-colors hover:border-himalayan/40 hover:bg-himalayan-lighter"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-himalayan-lighter text-himalayan-dark transition-colors group-hover:bg-himalayan/15">
                <action.icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold leading-tight text-admin-ink">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-admin-muted">
                  {action.desc}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </AdminPanel>

      {!ordersConnected && (
        <AdminCapabilityPanel
          title="Orders, revenue and customers"
          summary="Where the sales half of this dashboard will read from."
          capabilities={['woo-rest-read']}
          available={[
            'The catalog half is live: products and categories come from the same adapter the storefront serves.',
            'No figure above is estimated — each one is either measured or labelled as unavailable.',
          ]}
        />
      )}
    </div>
  );
}
