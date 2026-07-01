import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ExternalLink } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { ordersApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { OrderWithItems } from '../../lib/supabase/database.types';
import { SkeletonOrderList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function DealerInvoices() {
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
        const { orders } = await ordersApi.getUserOrders(user.id);
        setOrders(orders);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Invoices</h1>
        <p className="text-charcoal-light">Each order generates an invoice you can view in detail</p>
      </div>

      {loading ? (
        <SkeletonOrderList count={3} />
      ) : orders.length === 0 ? (
        <EmptyState icon={<Receipt size={40} />} title="No invoices yet" description="Invoices appear here once you place an order." />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Payment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-charcoal">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-charcoal">${order.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-light capitalize hidden sm:table-cell">{order.payment_status}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-himalayan hover:underline"
                      >
                        View
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
