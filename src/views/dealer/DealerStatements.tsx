import { useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { ordersApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

interface MonthlyStatement {
  month: string;
  orderCount: number;
  total: number;
}

export default function DealerStatements() {
  const { user } = useAuthContext();
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const { orders } = await ordersApi.getUserOrders(user.id);
        const byMonth = new Map<string, MonthlyStatement>();

        for (const order of orders) {
          const date = new Date(order.created_at);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
          const existing = byMonth.get(key) || { month: label, orderCount: 0, total: 0 };
          existing.orderCount += 1;
          existing.total += order.total;
          byMonth.set(key, existing);
        }

        setStatements(
          Array.from(byMonth.entries())
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([, value]) => value)
        );
      } catch (err) {
        console.error('Failed to load statements:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Statements</h1>
        <p className="text-charcoal-light">Monthly summary of your wholesale purchases</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={4} />
          </div>
        ) : statements.length === 0 ? (
          <EmptyState
            icon={<FileBarChart size={40} />}
            title="No statements yet"
            description="Monthly statements are generated from your order history."
            size="compact"
            className="border-0 shadow-none rounded-none py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Month</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statements.map((s) => (
                  <tr key={s.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-charcoal">{s.month}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-light">{s.orderCount}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal">${s.total.toFixed(2)}</td>
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
