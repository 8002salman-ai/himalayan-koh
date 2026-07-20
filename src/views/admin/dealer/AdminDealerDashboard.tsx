import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, DollarSign, FileCheck, ShoppingCart, Users } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { SkeletonDashboard } from '../../../components/ui/Skeleton';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';
import { useToast } from '../../../context/ToastContext';

type Stats = Awaited<ReturnType<typeof adminDealerApi.getDashboardStats>>;

const levelColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

export default function AdminDealerDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        setStats(await adminDealerApi.getDashboardStats());
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load dealer dashboard.'));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Wholesale Management</h1>
        <p className="text-charcoal-light">Applications, approved dealers, pricing, and program reporting</p>
      </div>

      <DealerManagementTabs />

      {loading ? (
        <SkeletonDashboard />
      ) : !stats ? (
        <p className="text-charcoal-light">Unable to load dealer stats.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FileCheck size={18} />} label="Pending Review" value={String(stats.byStatus.pending + stats.byStatus.under_review + stats.byStatus.need_more_info)} />
            <StatCard icon={<Building2 size={18} />} label="Approved Wholesalers" value={String(stats.byStatus.approved)} />
            <StatCard icon={<ShoppingCart size={18} />} label="Wholesale Orders" value={String(stats.totalDealerOrders)} />
            <StatCard icon={<DollarSign size={18} />} label="Wholesale Revenue" value={`$${stats.totalDealerRevenue.toFixed(2)}`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Clock size={18} className="text-himalayan" />
                Applications by Status
              </h2>
              <div className="space-y-2">
                {(Object.entries(stats.byStatus) as [string, number][]).map(([status, count]) => (
                  <Link
                    key={status}
                    to={`/admin/dealers/applications?status=${status}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-charcoal capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-semibold text-charcoal">{count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Users size={18} className="text-himalayan" />
                Dealers by Level
              </h2>
              <div className="space-y-2">
                {(Object.entries(stats.byLevel) as [string, number][]).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between px-3 py-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${levelColors[level]}`}>
                      {level}
                    </span>
                    <span className="text-sm font-semibold text-charcoal">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="w-9 h-9 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan mb-2">
        {icon}
      </div>
      <p className="text-xs text-charcoal-light uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-charcoal mt-0.5">{value}</p>
    </div>
  );
}
