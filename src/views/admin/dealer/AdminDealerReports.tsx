import { useEffect, useState } from 'react';
import { BarChart3, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { SkeletonDashboard } from '../../../components/ui/Skeleton';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/errors';

type Stats = Awaited<ReturnType<typeof adminDealerApi.getDashboardStats>>;
type Dealer = Awaited<ReturnType<typeof adminDealerApi.getDealers>>['dealers'][number];

export default function AdminDealerReports() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [topDealers, setTopDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const [statsResult, dealersResult] = await Promise.all([
          adminDealerApi.getDashboardStats(),
          adminDealerApi.getDealers({ limit: 100 }),
        ]);
        setStats(statsResult);
        setTopDealers([...dealersResult.dealers].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5));
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load dealer reports.'));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avgOrderValue = stats && stats.totalDealerOrders > 0 ? stats.totalDealerRevenue / stats.totalDealerOrders : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Wholesale Management</h1>
        <p className="text-charcoal-light">Program-wide performance reporting</p>
      </div>

      <DealerManagementTabs />

      {loading ? (
        <SkeletonDashboard />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="w-9 h-9 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan mb-2"><DollarSign size={18} /></div>
              <p className="text-xs text-charcoal-light uppercase tracking-wide">Total Dealer Revenue</p>
              <p className="text-lg font-bold text-charcoal mt-0.5">${(stats?.totalDealerRevenue || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="w-9 h-9 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan mb-2"><ShoppingCart size={18} /></div>
              <p className="text-xs text-charcoal-light uppercase tracking-wide">Total Dealer Orders</p>
              <p className="text-lg font-bold text-charcoal mt-0.5">{stats?.totalDealerOrders || 0}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="w-9 h-9 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan mb-2"><TrendingUp size={18} /></div>
              <p className="text-xs text-charcoal-light uppercase tracking-wide">Average Order Value</p>
              <p className="text-lg font-bold text-charcoal mt-0.5">${avgOrderValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-himalayan" />
              Top Wholesalers by Spend
            </h2>
            {topDealers.length === 0 ? (
              <p className="text-sm text-charcoal-light">No dealer orders recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {topDealers.map((dealer, i) => (
                  <div key={dealer.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50">
                    <span className="text-sm text-charcoal">{i + 1}. {dealer.business_name}</span>
                    <span className="text-sm font-semibold text-charcoal">${dealer.totalSpend.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
