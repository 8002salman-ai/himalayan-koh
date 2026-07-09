import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, ShoppingCart } from 'lucide-react';
import { formatCustomerOrderStatus, orderStatusBadgeClass } from '../../lib/orders/status';
import { useAuthContext } from '../../context/AuthContext';
import { wholesalePurchaseRequestApi } from '../../lib/supabase/api/wholesale';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { OrderWithItems } from '../../lib/supabase/database.types';
import { SkeletonOrderList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

/**
 * "Converted Orders" — real orders that came from a Purchase Request
 * being approved, paid, and converted. This is deliberately NOT a
 * general order history; Purchase Requests (still open/in review) live
 * on /dealer/purchase-requests, not here. See status.ts.
 */
export default function DealerOrders() {
  const { user } = useAuthContext();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const converted = await wholesalePurchaseRequestApi.getMyConvertedOrders(user.id);
        setOrders(converted as OrderWithItems[]);
      } catch (err) {
        console.error('Failed to load converted orders:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Converted Orders</h1>
        <p className="text-charcoal-light">Purchase requests that have been approved, paid, and converted into orders</p>
      </div>

      {loading ? (
        <SkeletonOrderList count={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={40} />}
          title="No converted orders yet"
          description="Submit a purchase request, and once it's approved, paid, and converted, it will appear here."
          action={{ label: 'View Purchase Requests', href: '/dealer/purchase-requests' }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan flex-shrink-0">
                  <Package size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-charcoal truncate">{order.order_number}</p>
                  <p className="text-xs text-charcoal-light">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${orderStatusBadgeClass(order.status, order.payment_status)}`}>
                  {formatCustomerOrderStatus(order.status, order.payment_status)}
                </span>
                <span className="font-bold text-charcoal hidden sm:block">${order.total.toFixed(2)}</span>
                <ChevronRight size={18} className="text-charcoal-light" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
