import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  FolderTree,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Users,
  BarChart3,
  Plus,
  FileText,
  PlugZap,
} from 'lucide-react';
import { adminApi, AdminDashboardAnalytics } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import { readAdminCatalogStats, type AdminCatalogStats } from '../../lib/backend';
import { getErrorMessage } from '../../lib/errors';
import {
  ADMIN_TD,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';
import { ICON_TILE, ICON_TILE_TONES, MICRO_LABEL } from '../../components/admin/adminTheme';

/**
 * The order and customer summary.
 *
 * Product and category facts are deliberately absent: they come from the catalog
 * read model (`catalogStats`), so this dashboard cannot count one catalog while
 * the storefront serves another.
 */
interface DashboardStats {
  recentOrders: number;
  totalRevenue: number;
}

/**
 * A figure the dashboard shows, or the reason it cannot.
 *
 * Orders, revenue and customers live in Supabase; the catalog does not. When
 * Supabase is not configured those panels say so instead of rendering `0`,
 * because zero orders and an unknown order count are different claims.
 */
type Figure = { value: number; formatted?: string } | null;

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [catalogStats, setCatalogStats] = useState<AdminCatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [realtimeNotice, setRealtimeNotice] = useState('');

  const ordersConnected = isSupabaseConfigured();

  const fetchDashboard = useCallback(async () => {
      try {
        setFetchError(null);
        // The catalog is read through the backend seam, so it works even when
        // Supabase — which still owns orders and customers — is not configured.
        const [data, analyticsData, catalogData] = await Promise.all([
          isSupabaseConfigured() ? adminApi.getDashboardStats() : Promise.resolve(null),
          isSupabaseConfigured() ? adminApi.getDashboardAnalytics() : Promise.resolve(null),
          readAdminCatalogStats(),
        ]);
        setStats(data);
        setAnalytics(analyticsData);
        setCatalogStats(catalogData);
      } catch (err) {
        setFetchError(getErrorMessage(err, 'Failed to load dashboard data.'));
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        setRealtimeNotice('New order received');
        fetchDashboard();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setRealtimeNotice('New customer activity');
        fetchDashboard();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory' }, () => {
        setRealtimeNotice('Inventory updated');
        fetchDashboard();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchDashboard]);

  const orders: Figure = stats ? { value: stats.recentOrders } : null;
  const revenue: Figure = stats
    ? { value: stats.totalRevenue, formatted: `$${stats.totalRevenue.toLocaleString()}` }
    : null;
  const customers: Figure = analytics ? { value: analytics.totalCustomers } : null;
  const newCustomers: Figure = analytics ? { value: analytics.newCustomers } : null;
  const repeatCustomers: Figure = analytics ? { value: analytics.repeatCustomers } : null;

  const maxRevenue = Math.max(...(analytics?.revenueSeries.map((point) => point.revenue) || [1]), 1);
  const maxProductRevenue = Math.max(...(analytics?.topProducts.map((product) => product.revenue) || [1]), 1);
  const unconnectedLabel = 'Not connected';

  const quickActions = [
    { label: 'Add product', path: '/admin/products?action=new', icon: Plus },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { label: 'SEO centre', path: '/admin/seo', icon: TrendingUp },
    { label: 'Blog posts', path: '/admin/blog', icon: FileText },
    { label: 'Users & roles', path: '/admin/users', icon: Users },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live catalog, orders and customer health for the Himalayan Koh storefront."
        actions={
          <>
            {realtimeNotice && <AdminChip tone="success">{realtimeNotice}</AdminChip>}
            <Link
              to="/admin/products?action=new"
              className="inline-flex items-center gap-2 rounded-xl bg-himalayan px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-himalayan-dark"
            >
              <Plus size={16} />
              Add product
            </Link>
          </>
        }
      />

      {fetchError && (
        <AdminNotice
          tone="danger"
          title="Dashboard failed to load"
          action={
            <button
              type="button"
              onClick={fetchDashboard}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          }
        >
          {fetchError}
        </AdminNotice>
      )}

      {!ordersConnected && (
        <AdminNotice tone="warning" title="Orders and customers are not connected">
          Supabase holds orders, revenue and customers, and its environment variables are not
          configured in this deployment. Those figures read <strong>Not connected</strong> below
          rather than zero. The product catalog is unaffected — it comes from the configured
          catalog source.
        </AdminNotice>
      )}

      {/* Figures. Every tile is either a real value or the reason there is none. */}
      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Total products"
          icon={Package}
          tone="brand"
          value={catalogStats?.total}
          unavailable={catalogStats === null ? 'Reading…' : undefined}
          hint={catalogStats?.source === 'woocommerce' ? 'WooCommerce' : 'Supabase'}
          to="/admin/products"
        />
        <AdminStatTile
          label="Categories"
          icon={FolderTree}
          tone="violet"
          value={catalogStats?.categories}
          unavailable={catalogStats === null ? 'Reading…' : undefined}
          to="/admin/categories"
        />
        <AdminStatTile
          label="Recent orders"
          icon={ShoppingCart}
          tone="green"
          value={orders?.value}
          unavailable={orders === null ? unconnectedLabel : undefined}
          hint="30 days"
          to="/admin/orders"
        />
        <AdminStatTile
          label="Total revenue"
          icon={DollarSign}
          tone="sky"
          value={revenue?.formatted}
          unavailable={revenue === null ? unconnectedLabel : undefined}
          hint="30 days"
          to="/admin/analytics"
        />
        <AdminStatTile
          label="Customers"
          icon={Users}
          tone="slate"
          value={customers?.value}
          unavailable={customers === null ? unconnectedLabel : undefined}
          to="/admin/customers"
        />
        <AdminStatTile
          label="New customers"
          icon={TrendingUp}
          tone="green"
          value={newCustomers?.value}
          unavailable={newCustomers === null ? unconnectedLabel : undefined}
          to="/admin/customers"
        />
        <AdminStatTile
          label="Repeat customers"
          icon={Users}
          tone="violet"
          value={repeatCustomers?.value}
          unavailable={repeatCustomers === null ? unconnectedLabel : undefined}
          to="/admin/customers"
        />
        {/* Inventory counts are a Supabase-column fact. A source that cannot
            report them shows what it can instead: how much commercial data is
            missing from the catalog. */}
        {catalogStats?.source === 'woocommerce' ? (
          <AdminStatTile
            label="Price unavailable"
            icon={AlertTriangle}
            tone="amber"
            value={catalogStats.priceUnavailable}
            hint="Store API blocked"
            to="/admin/products"
          />
        ) : (
          <AdminStatTile
            label="Inventory alerts"
            icon={AlertTriangle}
            tone="amber"
            value={analytics?.inventoryAlerts.length ?? catalogStats?.lowStock}
            unavailable={!analytics && catalogStats === null ? unconnectedLabel : undefined}
            to="/admin/inventory"
          />
        )}
      </div>

      {/* Catalog composition — the figures the active source can actually report. */}
      {catalogStats && (
        <AdminPanel
          title="Catalog source"
          description="What the storefront and this console read, and what that source can report about it."
          action={
            <AdminChip tone={catalogStats.source === 'woocommerce' ? 'brand' : 'neutral'}>
              {catalogStats.source === 'woocommerce' ? 'WooCommerce' : 'Supabase'}
            </AdminChip>
          }
        >
          <div className="grid grid-cols-4 gap-4">
            {(catalogStats.source === 'woocommerce'
              ? [
                  { label: 'Listed products', value: catalogStats.total },
                  { label: 'Featured', value: catalogStats.featured },
                  { label: 'SKU unavailable', value: catalogStats.skuUnavailable },
                  { label: 'Stock unknown', value: catalogStats.stockUnknown },
                ]
              : [
                  { label: 'Total products', value: catalogStats.total },
                  { label: 'Active', value: catalogStats.active },
                  { label: 'Inactive', value: catalogStats.inactive },
                  { label: 'Low stock', value: catalogStats.lowStock },
                ]
            ).map((entry) => (
              <div key={entry.label} className="rounded-xl border border-admin-line px-4 py-3">
                <p className={MICRO_LABEL}>{entry.label}</p>
                <p className="mt-1 text-xl font-bold text-admin-ink">{entry.value}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {/* Analytics. Rendered only when the orders source answered. */}
      {analytics ? (
        <div className="grid grid-cols-3 gap-4">
          <AdminPanel
            className="col-span-2"
            title="Revenue"
            description="Last 7 days, from Supabase order history."
            action={<BarChart3 size={18} className="text-himalayan" />}
          >
            <div className="flex h-64 items-end gap-3">
              {analytics.revenueSeries.map((point) => (
                <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 w-full items-end justify-center overflow-hidden rounded-xl bg-admin-canvas">
                    <div
                      className="w-full min-h-2 rounded-t-xl bg-gradient-to-t from-himalayan-dark to-himalayan transition-all"
                      style={{ height: `${Math.max(6, (point.revenue / maxRevenue) * 100)}%` }}
                      title={`$${point.revenue.toFixed(2)} · ${point.orders} orders`}
                    />
                  </div>
                  <span className="text-xs text-admin-muted">{point.label}</span>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Order status" description="Counts across the recent window.">
            <div className="space-y-3.5">
              {Object.entries(analytics.orderStatusCounts).map(([status, count]) => (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-admin-ink">{status}</span>
                    <span className="font-semibold text-admin-ink">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-admin-canvas">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-himalayan to-himalayan-dark"
                      style={{
                        width: `${stats?.recentOrders ? Math.min(100, (count / stats.recentOrders) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel
            className="col-span-2"
            title="Best sellers"
            description="Revenue by product, from order history."
          >
            {analytics.topProducts.length === 0 ? (
              <p className="text-sm text-admin-muted">No product sales yet.</p>
            ) : (
              <div className="space-y-4">
                {analytics.topProducts.map((product) => (
                  <div key={product.productName}>
                    <div className="mb-1 flex justify-between gap-4 text-sm">
                      <span className="truncate font-medium text-admin-ink">{product.productName}</span>
                      <span className="text-admin-muted">${product.revenue.toFixed(2)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-admin-canvas">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(5, (product.revenue / maxProductRevenue) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-admin-muted">{product.quantity} units sold</p>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          {/* Inventory counts come from Supabase, so this panel is only shown
              when that is the catalog the storefront is reading. */}
          {catalogStats?.source !== 'woocommerce' && (
            <AdminPanel title="Inventory alerts" description="Low-stock products.">
              {analytics.inventoryAlerts.length === 0 ? (
                <p className="text-sm text-admin-muted">No low-stock alerts.</p>
              ) : (
                <div className="space-y-2.5">
                  {analytics.inventoryAlerts.map((alert) => (
                    <Link
                      key={alert.productId}
                      to="/admin/inventory?filter=low_stock"
                      className="block rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 transition-colors hover:bg-amber-100"
                    >
                      <p className="truncate text-sm font-medium text-amber-900">{alert.productName}</p>
                      <p className="text-xs text-amber-800">
                        Qty {alert.quantity} · threshold {alert.threshold}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </AdminPanel>
          )}
        </div>
      ) : (
        !loading && (
          <AdminPanel
            title="Sales analytics"
            description="Revenue, best sellers and order status come from Supabase order history."
          >
            <div className="flex items-start gap-3 rounded-xl border border-admin-line bg-admin-canvas px-4 py-4">
              <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate}`}>
                <PlugZap size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-admin-ink">Not connected</p>
                <p className="mt-0.5 text-sm text-admin-muted">
                  No order source is configured for this deployment, so there are no sales figures to
                  show. Nothing here is estimated.
                </p>
              </div>
            </div>
          </AdminPanel>
        )
      )}

      <div className="grid grid-cols-2 gap-4">
        {catalogStats?.source === 'supabase' && catalogStats.lowStock > 0 && (
          <AdminPanel
            title="Low stock alert"
            description={`${catalogStats.lowStock} products are running low and need attention.`}
            action={
              <Link
                to="/admin/inventory?filter=low_stock"
                className="inline-flex items-center gap-1 text-sm font-semibold text-himalayan hover:underline"
              >
                Review
                <ArrowUpRight size={14} />
              </Link>
            }
          >
            <div className="flex items-center gap-3">
              <span className={`${ICON_TILE} ${ICON_TILE_TONES.amber}`}>
                <AlertTriangle size={16} />
              </span>
              <p className="text-sm text-admin-muted">
                Inventory counts are a Supabase column, so these figures disappear the moment the
                catalog moves to WooCommerce.
              </p>
            </div>
          </AdminPanel>
        )}

        <AdminPanel
          title="Quick actions"
          description="The daily jumps."
          className={catalogStats?.source === 'supabase' && catalogStats.lowStock > 0 ? '' : 'col-span-2'}
        >
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.path}
                className="flex items-center gap-3 rounded-xl border border-admin-line px-3.5 py-3 transition-colors hover:border-himalayan/40 hover:bg-himalayan-lighter"
              >
                <action.icon size={17} className="text-himalayan" />
                <span className="text-sm font-medium text-admin-ink">{action.label}</span>
              </Link>
            ))}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Recent activity" description="Orders, inventory and customer events.">
        {loading ? (
          <AdminTable
            columns={[
              { key: 'event', label: 'Event' },
              { key: 'time', label: 'When', align: 'right' },
            ]}
          >
            <AdminTableSkeleton rows={4} columns={2} />
          </AdminTable>
        ) : (analytics?.recentActivity || []).length === 0 ? (
          <p className="text-sm text-admin-muted">
            {ordersConnected
              ? 'No recent activity yet.'
              : 'No activity source is connected, so there is no recent activity to show.'}
          </p>
        ) : (
          <AdminTable
            columns={[
              { key: 'event', label: 'Event' },
              { key: 'time', label: 'When', align: 'right' },
            ]}
          >
            {analytics?.recentActivity.map((item) => (
              <tr key={`${item.type}-${item.id}`}>
                <td className={ADMIN_TD}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`${ICON_TILE} ${
                        item.type === 'order'
                          ? ICON_TILE_TONES.green
                          : item.type === 'inventory'
                            ? ICON_TILE_TONES.amber
                            : ICON_TILE_TONES.violet
                      }`}
                    >
                      {item.type === 'order' ? (
                        <ShoppingCart size={14} />
                      ) : item.type === 'inventory' ? (
                        <Package size={14} />
                      ) : (
                        <Users size={14} />
                      )}
                    </span>
                    <span className="font-medium">{item.action}</span>
                  </div>
                </td>
                <td className={`${ADMIN_TD} text-right text-admin-muted`}>
                  {new Date(item.time).toLocaleString()}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </>
  );
}
