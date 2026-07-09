import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Button } from '../../../components/ui';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { adminWholesaleApi, type AdminWholesaleOrderRow, type WholesaleOrderFilter } from '../../../lib/supabase/api/adminWholesale';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';
import { formatCustomerOrderStatus, orderStatusBadgeClass } from '../../../lib/orders/status';

const FILTER_TABS: { label: string; value: WholesaleOrderFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Payment', value: 'pending_payment' },
  { label: 'Paid', value: 'paid' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

/**
 * Wholesale Orders — real orders that originated from a converted
 * Purchase Request. Deliberately separate from /admin/orders (retail):
 * these are two different business processes, per the approved
 * architecture. Purchase requests still in review live on
 * /admin/dealers/purchase-requests, not here.
 */
export default function AdminWholesaleOrders() {
  const [orders, setOrders] = useState<AdminWholesaleOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WholesaleOrderFilter>('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setFetchError(null);
      const rows = await adminWholesaleApi.getWholesaleOrders(filter);
      setOrders(rows);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load wholesale orders.'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Wholesale Orders</h1>
        <p className="text-charcoal-light">Orders converted from approved, paid dealer purchase requests</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === tab.value ? 'bg-himalayan text-white' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Wholesale orders could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <Button variant="destructive" size="sm" onClick={fetchOrders} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package size={40} />}
            title="No wholesale orders found"
            description="Orders appear here once a purchase request is approved, paid, and converted."
            size="compact"
            className="border-0 shadow-none rounded-none py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Purchase Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Dealer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{order.order_number}</p>
                      <p className="text-xs text-charcoal-light">{order.order_items?.length || 0} item(s)</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {order.wholesale_purchase_requests?.request_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {order.wholesale_purchase_requests?.dealer_application?.business_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${orderStatusBadgeClass(order.status, order.payment_status)}`}>
                        {formatCustomerOrderStatus(order.status, order.payment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">${Number(order.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/orders?orderId=${order.id}`} className="text-sm font-semibold text-himalayan hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
