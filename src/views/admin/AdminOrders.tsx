import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Package,
  Search,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
/**
 * Orders are WooCommerce records.
 *
 * The screen's shape did not change: `AdminOrder` here is the store's order
 * projected into the same `Order`/`OrderItem` fields this view has always
 * rendered, and the filters are translated into the store's own query. What did
 * change is where the data comes from — the read and the status write both go to
 * the store now, so an owner's change is a change in WooCommerce.
 */
import {
  fetchAdminOrders,
  fetchLegacyOrders,
  type AdminOrderRecord as AdminOrder,
  type AdminOrderStats as AdminOrderAnalytics,
  type AdminOrderFilters,
  type LegacyOrderSummary,
} from '../../lib/admin/consoleApi';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/supabase/api/orders';
import { getErrorMessage } from '../../lib/errors';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  type AdminColumn,
} from '../../components/admin/AdminUI';
import {
  BUTTON,
  ICON_TILE,
  ICON_TILE_TONES,
  INPUT,
  MICRO_LABEL,
  SELECT,
  SURFACE,
  type ChipTone,
} from '../../components/admin/adminTheme';
import { createShippoLabel } from '../../lib/shippo/client';
import { getShippoClientConfig } from '../../lib/shippo/clientConfig';
import ShippingLabelPanel from '../../components/admin/ShippingLabelPanel';
import { updateAdminOrderStatus } from '../../lib/admin/updateOrderStatusClient';
import { publicEnv } from '../../lib/env';
import { formatPaymentMethod, formatPaymentStatus } from '../../lib/orders/display';
import { formatAdminOrderStatus, getAdminWorkflowHint } from '../../lib/orders/status';
import type { Json, Order } from '../../lib/supabase/database.types';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const orderStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentStatuses: Order['payment_status'][] = ['pending', 'paid', 'failed', 'refunded'];

/**
 * Order and payment status → the console's chip tone and icon.
 *
 * One owner for the mapping: the table row, the detail panel and any later
 * screen read the same table, so a status cannot look different in two places.
 */
const statusTones: Record<string, ChipTone> = {
  pending: 'warning',
  processing: 'info',
  shipped: 'brand',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'danger',
  paid: 'success',
  failed: 'danger',
};

const statusIcons: Record<string, LucideIcon> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: XCircle,
};

const ORDER_COLUMNS: AdminColumn[] = [
  { key: 'order', label: 'Order', width: '18%' },
  { key: 'customer', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'payment', label: 'Payment' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'actions', label: 'Actions', align: 'right', width: '170px' },
];

interface ShippingAddress {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export default function AdminOrders() {
  const { session } = useAuthContext();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [shippoRuntimeEnabled, setShippoRuntimeEnabled] = useState<boolean | null>(null);
  const shippoEnabled = shippoRuntimeEnabled ?? publicEnv.shippoEnabled;
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [analytics, setAnalytics] = useState<AdminOrderAnalytics | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [labelCreating, setLabelCreating] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelNotice, setLabelNotice] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [statusForm, setStatusForm] = useState({
    status: 'pending' as Order['status'],
    paymentStatus: 'pending' as Order['payment_status'],
    trackingNumber: '',
  });
  const [legacyOrders, setLegacyOrders] = useState<LegacyOrderSummary[]>([]);
  const [legacyCount, setLegacyCount] = useState(0);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [legacyLoading, setLegacyLoading] = useState(false);

  /**
   * The app's own pre-migration orders, read separately from the store's list.
   *
   * Failures here are silent by design: this panel is a record of what the app used
   * to hold, and a read error in it must not put an error banner over the store's
   * orders, which are the ones an owner acts on.
   */
  const loadLegacyOrders = useCallback(async () => {
    setLegacyLoading(true);
    try {
      const result = await fetchLegacyOrders({ limit: 25 });
      setLegacyOrders(result.orders ?? []);
      setLegacyCount(result.count ?? 0);
      setLegacyAvailable(Boolean(result.available));
    } catch {
      setLegacyOrders([]);
      setLegacyCount(0);
      setLegacyAvailable(false);
    } finally {
      setLegacyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLegacyOrders();
  }, [loadLegacyOrders]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      const filters: AdminOrderFilters = {
        search: search || undefined,
        status: statusFilter ? statusFilter as Order['status'] : undefined,
        page,
        limit: 10,
      };

      const ordersResult = await fetchAdminOrders(filters);

      setOrders(ordersResult.orders);
      setTotalCount(ordersResult.count);
      setTotalPages(ordersResult.totalPages || 1);
      setAnalytics(ordersResult.stats);
      setSelectedOrder((current) => {
        if (!current) return ordersResult.orders[0] || null;
        return ordersResult.orders.find((order) => order.id === current.id) || ordersResult.orders[0] || null;
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load orders.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    getShippoClientConfig()
      .then((config) => setShippoRuntimeEnabled(config.enabled))
      .catch(() => setShippoRuntimeEnabled(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const deepLinkOrderId = searchParams.get('orderId');

  useEffect(() => {
    if (!deepLinkOrderId || orders.length === 0) return;
    const match = orders.find((order) => order.id === deepLinkOrderId);
    if (match) {
      setSelectedOrder(match);
    }
  }, [deepLinkOrderId, orders]);

  /**
   * Order figures, or the reason there is none.
   *
   * Every tile is bound to the order source: with no analytics response they say
   * "Not connected" rather than zero, because zero orders and an unread order
   * count are different claims.
   */
  const ordersUnavailable = analytics === null ? 'Not connected' : undefined;
  const statCards = [
    { label: 'Total orders', value: analytics?.totalOrders, icon: Package, tone: 'sky' as const },
    { label: 'Pending', value: analytics?.pendingOrders, icon: Clock, tone: 'amber' as const },
    { label: 'Processing', value: analytics?.processingOrders, icon: Package, tone: 'violet' as const },
    { label: 'Shipped', value: analytics?.shippedOrders, icon: Truck, tone: 'slate' as const },
    { label: 'Delivered', value: analytics?.deliveredOrders, icon: Check, tone: 'green' as const },
    { label: 'Cancelled', value: analytics?.cancelledOrders, icon: XCircle, tone: 'amber' as const },
    { label: 'Refund requests', value: analytics?.refundRequests, icon: AlertTriangle, tone: 'amber' as const },
    { label: 'Revenue', value: analytics ? `$${analytics.totalRevenue.toLocaleString()}` : undefined, icon: DollarSign, tone: 'brand' as const },
  ];

  const openStatusModal = (order: AdminOrder) => {
    setEditingOrder(order);
    setStatusForm({
      status: normalizeStatus(order.status),
      paymentStatus: order.payment_status,
      trackingNumber: order.tracking_number || '',
    });
  };

  const handleStatusSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingOrder) return;

    const token = session?.access_token;
    if (!token) return;

    setSaving(true);
    try {
      await updateAdminOrderStatus(token, {
        orderId: editingOrder.id,
        status: statusForm.status,
        paymentStatus: statusForm.paymentStatus,
        trackingNumber: statusForm.trackingNumber || undefined,
      });
      toast.success('Order status updated successfully.');
      setEditingOrder(null);
      await fetchOrders();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update order status.'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setLabelError(null);
    setLabelNotice(null);
  }, [selectedOrder?.id]);

  const handleCreateShippoLabel = async (order: AdminOrder) => {
    const token = session?.access_token;
    if (!token) {
      setLabelError('Sign in again to create shipping labels.');
      return;
    }

    setLabelCreating(true);
    setLabelError(null);
    setLabelNotice(null);
    try {
      const result = await createShippoLabel(order.id, token);
      await fetchOrders();
      const costInfo = typeof result.rateAmount === 'number' ? ` Carrier cost: $${result.rateAmount.toFixed(2)}.` : '';
      const boxInfo = result.parcelCount && result.parcelCount > 1 ? ` ${result.parcelCount} boxes — one label per box.` : '';
      if (result.usedFallbackCarrier && result.carrier) {
        setLabelNotice(
          `Label created with ${result.carrier} (${result.serviceName || 'shipping'}).${costInfo}${boxInfo}`,
        );
      } else if (result.trackingNumber) {
        setLabelNotice(`Shipping label ready. Tracking: ${result.trackingNumber}.${costInfo}${boxInfo}`);
      }
      const urls = result.labelUrls?.length ? result.labelUrls : result.labelUrl ? [result.labelUrl] : [];
      for (const url of urls) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : 'Unable to create Shippo label.');
    } finally {
      setLabelCreating(false);
    }
  };

  const handlePrintInvoice = (order: AdminOrder) => {
    const invoiceWindow = window.open('', '_blank', 'width=800,height=900');
    if (!invoiceWindow) return;

    const address = toShippingAddress(order.shipping_address);
    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
            h1 { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
            .totals { margin-left: auto; width: 260px; margin-top: 24px; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; }
            .total { font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>
          <p>${escapeHtml(order.order_number)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(order.profile?.full_name || order.email)}<br/>${escapeHtml(order.email)}${order.phone ? `<br/>${escapeHtml(order.phone)}` : ''}</p>
          <p><strong>Ship To:</strong><br/>${escapeHtml(address.fullName)}<br/>${escapeHtml(address.addressLine1)}<br/>${escapeHtml([address.city, address.state, address.postalCode].filter(Boolean).join(', '))}<br/>${escapeHtml(address.country)}</p>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
            <tbody>
              ${order.order_items.map((item) => `
                <tr>
                  <td>${escapeHtml(item.product_name)}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unit_price.toFixed(2)}</td>
                  <td>$${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
            <div class="row"><span>Shipping</span><span>$${order.shipping_cost.toFixed(2)}</span></div>
            <div class="row"><span>Tax</span><span>$${order.tax_amount.toFixed(2)}</span></div>
            <div class="row total"><span>Total</span><span>$${order.total.toFixed(2)}</span></div>
          </div>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
    invoiceWindow.print();
  };

  const selectedAddress = useMemo(
    () => toShippingAddress(selectedOrder?.shipping_address),
    [selectedOrder?.shipping_address],
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Customer orders — update payment, create Shippo labels, print invoices and ship."
        actions={
          <Link to="/admin/labels" className={BUTTON.secondary}>
            <Truck size={16} />
            Shipping labels
          </Link>
        }
      />

      <AdminNotice tone="info" title="Orders are read from the store">
        Every order here is WooCommerce&apos;s own record: its number, its money, its status and its lines.
        The figures below count the orders the store reported. Payment status is shown per order but is not a
        filter this console can ask the store for, so the only status filters are the store&apos;s own —
        including Refunded, which is how a refund request is found.
      </AdminNotice>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <AdminStatTile
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            unavailable={stat.value === undefined ? ordersUnavailable : undefined}
          />
        ))}
      </div>

      <AdminPanel bodyClassName="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order number, email, or phone…"
              aria-label="Search orders"
              className={`${SELECT} w-full pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by order status"
            className={SELECT}
          >
            <option value="">All statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>{capitalize(status)}</option>
            ))}
          </select>
          <AdminButton onClick={() => setStatusFilter('refunded')}>
            Refunded orders
          </AdminButton>
          <span className={`ml-auto ${MICRO_LABEL}`}>
            {loading ? 'Reading…' : `${totalCount} order${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>
      </AdminPanel>

      <div className="grid grid-cols-3 gap-5">
        <div className={`col-span-2 ${SURFACE} overflow-hidden`}>
          {loading ? (
            <AdminTable columns={ORDER_COLUMNS}>
              <AdminTableSkeleton rows={5} columns={ORDER_COLUMNS.length} />
            </AdminTable>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
                <Package size={20} />
              </span>
              <p className="text-sm font-semibold text-admin-ink">No orders found</p>
              <p className="text-sm text-admin-muted">
                {search || statusFilter
                  ? 'No order in the store matches this search or filter.'
                  : 'Orders appear here as soon as customers place them.'}
              </p>
            </div>
          ) : (
            <>
              <AdminTable columns={ORDER_COLUMNS}>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`cursor-pointer transition-colors ${selectedOrder?.id === order.id ? 'bg-himalayan-lighter' : 'hover:bg-admin-canvas/60'}`}
                      >
                        <td className={ADMIN_TD}>
                          <p className="font-semibold text-admin-ink">{order.order_number}</p>
                          <p className="text-[11px] text-admin-muted">{new Date(order.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className={ADMIN_TD}>
                          <p className="text-sm font-medium text-admin-ink">{order.profile?.full_name || order.email}</p>
                          <p className="text-[11px] text-admin-muted">{order.email}</p>
                        </td>
                        <td className={ADMIN_TD}>
                          <AdminChip
                            tone={statusTones[order.status] ?? 'neutral'}
                            icon={statusIcons[order.status]}
                          >
                            {formatAdminOrderStatus(order.status, order.payment_status)}
                          </AdminChip>
                        </td>
                        <td className={ADMIN_TD}>
                          <p className="text-xs font-medium text-admin-ink">{formatPaymentMethod(order.payment_method)}</p>
                          <span className="mt-1 inline-flex">
                            <AdminChip tone={statusTones[order.payment_status] ?? 'neutral'}>
                              {formatPaymentStatus(order.payment_status)}
                            </AdminChip>
                          </span>
                        </td>
                        <td className={`${ADMIN_TD} text-right font-semibold`}>${order.total.toFixed(2)}</td>
                        <td className={`${ADMIN_TD} text-right`}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openStatusModal(order);
                              }}
                              className="rounded-lg bg-himalayan px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-himalayan-dark"
                            >
                              Update
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handlePrintInvoice(order);
                              }}
                              className="rounded-lg border border-admin-line px-2.5 py-1.5 text-xs font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
                            >
                              Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </AdminTable>

              <div className="flex items-center justify-between border-t border-admin-line px-5 py-3">
                <p className="text-sm text-admin-muted">
                  Showing {orders.length} of {totalCount} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-admin-line p-2 text-admin-muted transition-colors hover:bg-admin-canvas disabled:opacity-45"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-admin-muted">Page {page} of {totalPages}</span>
                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-admin-line p-2 text-admin-muted transition-colors hover:bg-admin-canvas disabled:opacity-45"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <OrderDetailPanel
          order={selectedOrder}
          address={selectedAddress}
          onUpdate={openStatusModal}
          onInvoice={handlePrintInvoice}
          shippoEnabled={shippoEnabled}
          labelCreating={labelCreating}
          labelError={labelError}
          labelNotice={labelNotice}
          onCreateLabel={handleCreateShippoLabel}
        />
      </div>

      <AnimatePresence>
        {editingOrder && (
          <AdminModal
            title="Update order"
            description={`${editingOrder.order_number} — status, payment and tracking`}
            onClose={() => setEditingOrder(null)}
          >
              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div>
                  <label htmlFor="order-status" className={MICRO_LABEL}>Order status</label>
                  <select
                    id="order-status"
                    value={statusForm.status}
                    onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as Order['status'] })}
                    className={`${SELECT} mt-1.5 w-full`}
                  >
                    <option value="pending">Awaiting fulfillment</option>
                    <option value="processing">Processing &amp; packing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <p className="mt-1 text-xs text-admin-muted">
                    Use Processing when payment is confirmed and you are packing. Shippo label auto-sets Shipped.
                  </p>
                </div>

                <div>
                  <label htmlFor="payment-status" className={MICRO_LABEL}>Payment status</label>
                  <select
                    id="payment-status"
                    value={statusForm.paymentStatus}
                    onChange={(event) => setStatusForm({ ...statusForm, paymentStatus: event.target.value as Order['payment_status'] })}
                    className={`${SELECT} mt-1.5 w-full`}
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>{capitalize(status)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tracking-number" className={MICRO_LABEL}>Tracking number</label>
                  <input
                    id="tracking-number"
                    value={statusForm.trackingNumber}
                    onChange={(event) => setStatusForm({ ...statusForm, trackingNumber: event.target.value })}
                    placeholder="Carrier tracking number"
                    className={`${INPUT} mt-1.5 w-full`}
                  />
                  <p className="mt-1 text-xs text-admin-muted">Used for shipped order tracking.</p>
                </div>

                <button type="submit" disabled={saving} className={`${BUTTON.primary} w-full`}>
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save updates
                </button>
              </form>
          </AdminModal>
        )}
      </AnimatePresence>

      {/**
       * Orders the app recorded before WooCommerce became the order source.
       *
       * They are shown separately and labelled because they are not the store's
       * records: merging them into the table above would produce a count true of
       * neither system, and hiding them would look like they had been lost. This
       * panel is read-only — status changes write the store, and a legacy record
       * has no store mirror to change.
       */}
      {legacyAvailable && (
        <AdminPanel
          title="App-recorded orders (pre-migration)"
          description="Read from this application's own order table. These are not WooCommerce records and cannot be updated from this console."
          action={<AdminChip tone="warning">Legacy source</AdminChip>}
        >
          {legacyLoading ? (
            <p className="text-sm text-admin-muted">Reading…</p>
          ) : legacyOrders.length === 0 ? (
            <p className="text-sm text-admin-muted">
              This application’s order table holds no orders.
            </p>
          ) : (
            <AdminTable
              columns={[
                { key: 'number', label: 'Order' },
                { key: 'email', label: 'Email' },
                { key: 'status', label: 'Status' },
                { key: 'payment', label: 'Payment' },
                { key: 'total', label: 'Total', align: 'right' },
              ]}
            >
              {legacyOrders.map((order) => (
                <tr key={order.id}>
                  <td className={ADMIN_TD}>
                    <p className="font-semibold text-admin-ink">{order.order_number}</p>
                    <p className="text-[11px] text-admin-muted">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{order.email}</td>
                  <td className={ADMIN_TD}>
                    <AdminChip tone="muted">{order.status}</AdminChip>
                  </td>
                  <td className={ADMIN_TD}>
                    <AdminChip tone="muted">{order.payment_status}</AdminChip>
                  </td>
                  <td className={`${ADMIN_TD} text-right font-semibold`}>
                    ${order.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
          <p className="mt-3 text-sm text-admin-muted">
            {legacyCount} order{legacyCount === 1 ? '' : 's'} are recorded here. Moving them, or making
            WooCommerce the only order record, is the remaining step of the order migration — it waits on a
            verified payment leg, because an order is created before the card is charged.
          </p>
        </AdminPanel>
      )}
    </>
  );
}

function OrderDetailPanel({
  order,
  address,
  onUpdate,
  onInvoice,
  shippoEnabled,
  labelCreating,
  labelError,
  labelNotice,
  onCreateLabel,
}: {
  order: AdminOrder | null;
  address: ShippingAddress;
  onUpdate: (order: AdminOrder) => void;
  onInvoice: (order: AdminOrder) => void;
  shippoEnabled: boolean;
  labelCreating: boolean;
  labelError: string | null;
  labelNotice: string | null;
  onCreateLabel: (order: AdminOrder) => void;
}) {
  if (!order) {
    return (
      <div className={`${SURFACE} flex flex-col items-center gap-3 p-10 text-center`}>
        <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
          <Package size={20} />
        </span>
        <p className="text-sm font-semibold text-admin-ink">No order selected</p>
        <p className="text-sm text-admin-muted">Pick an order from the list to see its detail.</p>
      </div>
    );
  }

  return (
    <div className={`${SURFACE} h-fit p-6`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-admin-ink">Order detail</h3>
          <p className="text-sm text-admin-muted">{order.order_number}</p>
        </div>
        <AdminChip tone={statusTones[order.status] ?? 'neutral'} icon={statusIcons[order.status]}>
          {formatAdminOrderStatus(order.status, order.payment_status)}
        </AdminChip>
      </div>

      {getAdminWorkflowHint(order) && (
        <div className="mb-5 rounded-xl border border-himalayan/25 bg-himalayan-lighter px-4 py-3 text-sm">
          <p className="font-semibold text-himalayan-dark">Admin next step</p>
          <p className="mt-1 text-admin-muted">{getAdminWorkflowHint(order)}</p>
        </div>
      )}

      <div className="mb-5 space-y-2.5">
        <InfoRow label="Customer" value={order.profile?.full_name || order.email} />
        <InfoRow label="Email" value={order.email} />
        <InfoRow label="Phone" value={order.phone || 'Not provided'} />
        <InfoRow label="Payment method" value={formatPaymentMethod(order.payment_method)} />
        <InfoRow label="Payment status" value={formatPaymentStatus(order.payment_status)} />
      </div>

      <div className="mb-5 border-t border-admin-line pt-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-admin-ink">
          <Truck size={16} className="text-himalayan" />
          Shipping
        </h4>
        <div className="space-y-2">
          {(() => {
            const info = describeShipping(order);
            return (
              <>
                <InfoRow label="Type" value={info.typeLabel} />
                {info.carrier && <InfoRow label="Carrier" value={info.carrier} />}
                {info.service && <InfoRow label="Service" value={info.service} />}
                {order.tracking_number && <InfoRow label="Tracking" value={order.tracking_number} />}
                {!order.tracking_number && order.shipping_carrier && (
                  <InfoRow label="Tracking" value="Not yet assigned" />
                )}
              </>
            );
          })()}
        </div>
      </div>

      {order.notes && (
        <div className="mb-5 border-t border-admin-line pt-4">
          <h4 className="mb-2 text-sm font-semibold text-admin-ink">Order notes</h4>
          <p className="whitespace-pre-line text-xs leading-5 text-admin-muted">{order.notes}</p>
        </div>
      )}

      <div className="mb-5 border-t border-admin-line pt-4">
        <h4 className="mb-3 text-sm font-semibold text-admin-ink">Shipping address</h4>
        <div className="text-sm leading-6 text-admin-muted">
          <p className="font-medium text-admin-ink">{address.fullName}</p>
          <p>{address.addressLine1}</p>
          {address.addressLine2 && <p>{address.addressLine2}</p>}
          <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
          <p>{address.country}</p>
        </div>
      </div>

      <div className="mb-5 border-t border-admin-line pt-4">
        <h4 className="mb-3 text-sm font-semibold text-admin-ink">Items</h4>
        <div className="space-y-3">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <img src={item.product_image || '/images/placeholder-product.svg'} alt={item.product_name} className="h-11 w-11 rounded-lg bg-admin-canvas object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-admin-ink">{item.product_name}</p>
                <p className="text-xs text-admin-muted">Qty {item.quantity} × ${item.unit_price.toFixed(2)}</p>
              </div>
              <p className="text-sm font-semibold text-admin-ink">${item.total_price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-admin-line pt-4">
        <InfoRow label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
        <InfoRow label="Shipping" value={`$${order.shipping_cost.toFixed(2)}`} />
        <InfoRow label="Tax" value={`$${order.tax_amount.toFixed(2)}`} />
        <div className="flex justify-between border-t border-admin-line pt-2 text-lg font-bold">
          <span className="text-admin-ink">Total</span>
          <span className="text-himalayan">${order.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6 mb-4">
        <ShippingLabelPanel
          order={order}
          shippoEnabled={shippoEnabled}
          labelCreating={labelCreating}
          labelError={labelError}
          labelNotice={labelNotice}
          onCreateLabel={() => onCreateLabel(order)}
          variant="full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AdminButton variant="primary" icon={CreditCard} onClick={() => onUpdate(order)}>
          Update
        </AdminButton>
        <AdminButton icon={FileText} onClick={() => onInvoice(order)}>
          Invoice
        </AdminButton>
      </div>
    </div>
  );
}

/** Detail rows share the console's label/value rhythm from the token layer. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className={MICRO_LABEL}>{label}</span>
      <span className="text-right font-medium text-admin-ink">{value}</span>
    </div>
  );
}

function toShippingAddress(value: Json | undefined): ShippingAddress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ShippingAddress;
}

function describeShipping(order: AdminOrder): {
  typeLabel: string;
  carrier?: string;
  service?: string;
} {
  const billing = order.billing_address as Record<string, unknown> | null;
  const shippingMethod = typeof billing?.shippingMethod === 'string' ? billing.shippingMethod : 'standard';

  if (order.shipping_carrier) {
    return {
      typeLabel: 'Live carrier rate (Shippo)',
      carrier: order.shipping_carrier,
      service: order.shipping_service || undefined,
    };
  }

  if (order.shipping_cost === 0) {
    return {
      typeLabel: order.subtotal >= FREE_SHIPPING_THRESHOLD ? `Free shipping (order over $${FREE_SHIPPING_THRESHOLD})` : 'Free shipping',
    };
  }

  const method = shippingMethod === 'expedited' ? 'Expedited' : 'Standard';
  const price = shippingMethod === 'expedited' ? '$18.95' : '$9.95';
  return {
    typeLabel: `${method} flat rate (${price})`,
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeStatus(status: Order['status']): Order['status'] {
  if (status === 'confirmed') return 'pending';
  if (status === 'refunded') return 'cancelled';
  return status;
}
