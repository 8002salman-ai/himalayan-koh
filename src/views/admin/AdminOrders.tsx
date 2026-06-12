import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  XCircle,
} from 'lucide-react';
import { adminApi, AdminOrder, AdminOrderAnalytics, AdminOrderFilters } from '../../lib/supabase/api/admin';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/supabase/api/orders';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuthContext } from '../../context/AuthContext';
import { createShippoLabel } from '../../lib/shippo/client';
import ShippingLabelPanel from '../../components/admin/ShippingLabelPanel';
import { updateAdminOrderStatus } from '../../lib/admin/updateOrderStatusClient';
import { publicEnv } from '../../lib/env';
import { formatPaymentMethod, formatPaymentStatus } from '../../lib/orders/display';
import { formatAdminOrderStatus, getAdminWorkflowHint } from '../../lib/orders/status';
import type { Json, Order } from '../../lib/supabase/database.types';

const orderStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const paymentStatuses: Order['payment_status'][] = ['pending', 'paid', 'failed', 'refunded'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  processing: <Package size={14} />,
  shipped: <Truck size={14} />,
  delivered: <Check size={14} />,
  cancelled: <XCircle size={14} />,
};

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
  const [searchParams] = useSearchParams();
  const shippoEnabled = publicEnv.shippoEnabled;
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
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusForm, setStatusForm] = useState({
    status: 'pending' as Order['status'],
    paymentStatus: 'pending' as Order['payment_status'],
    trackingNumber: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setOrders([]);
      setAnalytics(null);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      const filters: AdminOrderFilters = {
        search: search || undefined,
        status: statusFilter ? statusFilter as Order['status'] : undefined,
        paymentStatus: paymentFilter ? paymentFilter as Order['payment_status'] : undefined,
        page,
        limit: 10,
      };

      const [ordersResult, analyticsResult] = await Promise.all([
        adminApi.getOrders(filters),
        adminApi.getOrderAnalytics(),
      ]);

      setOrders(ordersResult.orders);
      setTotalCount(ordersResult.count);
      setTotalPages(ordersResult.totalPages || 1);
      setAnalytics(analyticsResult);
      setSelectedOrder((current) => {
        if (!current) return ordersResult.orders[0] || null;
        return ordersResult.orders.find((order) => order.id === current.id) || ordersResult.orders[0] || null;
      });
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, paymentFilter, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter]);

  const deepLinkOrderId = searchParams.get('orderId');

  useEffect(() => {
    if (!deepLinkOrderId || orders.length === 0) return;
    const match = orders.find((order) => order.id === deepLinkOrderId);
    if (match) {
      setSelectedOrder(match);
    }
  }, [deepLinkOrderId, orders]);

  const statCards = [
    { label: 'Total Orders', value: analytics?.totalOrders || 0, icon: Package, color: 'bg-blue-500' },
    { label: 'Pending', value: analytics?.pendingOrders || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Processing', value: analytics?.processingOrders || 0, icon: Package, color: 'bg-purple-500' },
    { label: 'Shipped', value: analytics?.shippedOrders || 0, icon: Truck, color: 'bg-indigo-500' },
    { label: 'Delivered', value: analytics?.deliveredOrders || 0, icon: Check, color: 'bg-green-500' },
    { label: 'Cancelled', value: analytics?.cancelledOrders || 0, icon: XCircle, color: 'bg-red-500' },
    { label: 'Refund Requests', value: analytics?.refundRequests || 0, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'Revenue', value: `$${(analytics?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-himalayan' },
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
      setEditingOrder(null);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
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
      if (result.usedFallbackCarrier && result.carrier) {
        setLabelNotice(
          `Label created with ${result.carrier} (${result.serviceName || 'shipping'}). Checkout used a carrier that is not active in Shippo, so we switched to the next available rate.`,
        );
      } else if (result.trackingNumber) {
        setLabelNotice(`Shipping label ready. Tracking number ${result.trackingNumber}.`);
      }
      if (result.labelUrl) {
        window.open(result.labelUrl, '_blank', 'noopener,noreferrer');
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
          <p>${order.order_number}</p>
          <p><strong>Customer:</strong> ${order.profile?.full_name || order.email}<br/>${order.email}${order.phone ? `<br/>${order.phone}` : ''}</p>
          <p><strong>Ship To:</strong><br/>${address.fullName || ''}<br/>${address.addressLine1 || ''}<br/>${[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}<br/>${address.country || ''}</p>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
            <tbody>
              ${order.order_items.map((item) => `
                <tr>
                  <td>${item.product_name}</td>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Manage store orders</h1>
          <p className="text-charcoal-light">
            All customer orders — update payment, create Shippo labels, print invoices, and ship.
          </p>
        </div>
        <Link
          to="/admin/labels"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Truck size={16} />
          Shipping Labels
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
            <p className="text-sm text-charcoal-light">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order number, email, or phone..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
          >
            <option value="">All Statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>{capitalize(status)}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
          >
            <option value="">All Payments</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>{capitalize(status)}</option>
            ))}
          </select>
          <button
            onClick={() => setPaymentFilter('refunded')}
            className="px-4 py-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors"
          >
            Refund Requests
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-himalayan" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-charcoal-light">
              <Package size={48} className="mx-auto mb-4 text-gray-200" />
              <p>No orders found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Order</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Customer</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Status</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-charcoal-light uppercase">Payment</th>
                      <th className="px-5 py-4 text-right text-xs font-semibold text-charcoal-light uppercase">Total</th>
                      <th className="px-5 py-4 text-right text-xs font-semibold text-charcoal-light uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedOrder?.id === order.id ? 'bg-himalayan/5' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-charcoal">{order.order_number}</p>
                          <p className="text-xs text-charcoal-light">{new Date(order.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-charcoal">{order.profile?.full_name || order.email}</p>
                          <p className="text-xs text-charcoal-light">{order.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusIcons[order.status]}
                            {formatAdminOrderStatus(order.status, order.payment_status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-medium text-charcoal">{formatPaymentMethod(order.payment_method)}</p>
                          <span className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                            {formatPaymentStatus(order.payment_status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-charcoal">${order.total.toFixed(2)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openStatusModal(order);
                              }}
                              className="px-3 py-1.5 bg-himalayan text-white rounded-lg text-xs font-semibold hover:bg-himalayan-dark transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handlePrintInvoice(order);
                              }}
                              className="px-3 py-1.5 bg-gray-100 text-charcoal rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                            >
                              Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-charcoal-light">
                  Showing {orders.length} of {totalCount} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-charcoal-light">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={18} />
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
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setEditingOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-20 mx-auto max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-charcoal">Update Order</h2>
                  <p className="text-sm text-charcoal-light">{editingOrder.order_number}</p>
                </div>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Order Status</label>
                  <select
                    value={statusForm.status}
                    onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as Order['status'] })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
                  >
                    <option value="pending">Awaiting fulfillment</option>
                    <option value="processing">Processing &amp; packing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <p className="text-xs text-charcoal-light mt-1">
                    Use Processing when payment is confirmed and you are packing. Shippo label auto-sets Shipped.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Payment Status</label>
                  <select
                    value={statusForm.paymentStatus}
                    onChange={(event) => setStatusForm({ ...statusForm, paymentStatus: event.target.value as Order['payment_status'] })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>{capitalize(status)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Tracking Number</label>
                  <input
                    value={statusForm.trackingNumber}
                    onChange={(event) => setStatusForm({ ...statusForm, trackingNumber: event.target.value })}
                    placeholder="Carrier tracking number"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
                  />
                  <p className="text-xs text-charcoal-light mt-1">Used for shipped order tracking.</p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-himalayan text-white rounded-xl font-semibold hover:bg-himalayan-dark transition-colors disabled:opacity-70"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Save Updates
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
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
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        <Package size={48} className="mx-auto mb-4 text-gray-200" />
        <p className="text-charcoal-light">Select an order to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 h-fit">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-serif text-lg font-bold text-charcoal">Order Detail</h3>
          <p className="text-sm text-charcoal-light">{order.order_number}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusIcons[order.status]}
          {formatAdminOrderStatus(order.status, order.payment_status)}
        </span>
      </div>

      {getAdminWorkflowHint(order) && (
        <div className="mb-5 rounded-xl border border-himalayan/20 bg-himalayan/5 px-4 py-3 text-sm text-charcoal">
          <p className="font-semibold text-himalayan">Admin next step</p>
          <p className="mt-1 text-charcoal-light">{getAdminWorkflowHint(order)}</p>
        </div>
      )}

      <div className="space-y-3 mb-5">
        <InfoRow label="Customer" value={order.profile?.full_name || order.email} />
        <InfoRow label="Email" value={order.email} />
        <InfoRow label="Phone" value={order.phone || 'Not provided'} />
        <InfoRow label="Payment method" value={formatPaymentMethod(order.payment_method)} />
        <InfoRow label="Payment status" value={formatPaymentStatus(order.payment_status)} />
      </div>

      <div className="border-t border-gray-100 pt-4 mb-5">
        <h4 className="font-semibold text-charcoal mb-3 flex items-center gap-2">
          <Truck size={15} className="text-himalayan" />
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

      <div className="border-t border-gray-100 pt-4 mb-5">
        <h4 className="font-semibold text-charcoal mb-3">Shipping Address</h4>
        <div className="text-sm text-charcoal-light leading-6">
          <p className="font-medium text-charcoal">{address.fullName}</p>
          <p>{address.addressLine1}</p>
          {address.addressLine2 && <p>{address.addressLine2}</p>}
          <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
          <p>{address.country}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mb-5">
        <h4 className="font-semibold text-charcoal mb-3">Items</h4>
        <div className="space-y-3">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <img src={item.product_image || ''} alt={item.product_name} className="w-11 h-11 rounded-lg object-cover bg-gray-100" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{item.product_name}</p>
                <p className="text-xs text-charcoal-light">Qty {item.quantity} x ${item.unit_price.toFixed(2)}</p>
              </div>
              <p className="text-sm font-semibold text-charcoal">${item.total_price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-2">
        <InfoRow label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
        <InfoRow label="Shipping" value={`$${order.shipping_cost.toFixed(2)}`} />
        <InfoRow label="Tax" value={`$${order.tax_amount.toFixed(2)}`} />
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
          <span className="text-charcoal">Total</span>
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
        <button
          onClick={() => onUpdate(order)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-himalayan text-white rounded-xl font-semibold hover:bg-himalayan-dark transition-colors"
        >
          <CreditCard size={16} />
          Update
        </button>
        <button
          onClick={() => onInvoice(order)}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-charcoal rounded-xl font-semibold hover:bg-gray-50 transition-colors"
        >
          <FileText size={16} />
          Invoice
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-charcoal-light">{label}</span>
      <span className="font-medium text-charcoal text-right">{value}</span>
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
