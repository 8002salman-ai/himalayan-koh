import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Package, Receipt, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { dealerApi, ordersApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { DealerApplicationWithDocuments } from '../../lib/supabase/database.types';
import { SkeletonDashboard } from '../../components/ui/Skeleton';

const levelColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

export default function DealerDashboard() {
  const { user, profile } = useAuthContext();
  const [application, setApplication] = useState<DealerApplicationWithDocuments | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const [app, ordersResult] = await Promise.all([
          dealerApi.getMyApplication(user.id),
          ordersApi.getUserOrders(user.id),
        ]);
        setApplication(app);
        setOrderCount(ordersResult.count);
        setPendingCount(ordersResult.orders.filter((o) => o.status === 'pending' || o.status === 'processing').length);
      } catch (err) {
        console.error('Failed to load dealer dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) return <SkeletonDashboard />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-charcoal-light">{application?.business_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan">
              <Award size={18} />
            </div>
            <div>
              <p className="text-xs text-charcoal-light uppercase tracking-wide">Dealer Level</p>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  levelColors[application?.dealer_level || 'bronze']
                }`}
              >
                {application?.dealer_level || 'Bronze'}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="text-xs text-charcoal-light uppercase tracking-wide">Total Orders</p>
              <p className="text-xl font-bold text-charcoal">{orderCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan">
              <Package size={18} />
            </div>
            <div>
              <p className="text-xs text-charcoal-light uppercase tracking-wide">In Progress</p>
              <p className="text-xl font-bold text-charcoal">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/dealer/products"
          className="group bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-charcoal">Browse Dealer Catalog</h3>
            <p className="text-sm text-charcoal-light mt-1">View products at your dealer pricing</p>
          </div>
          <ArrowUpRight size={20} className="text-himalayan group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
        <Link
          to="/dealer/orders"
          className="group bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold text-charcoal">View Order History</h3>
            <p className="text-sm text-charcoal-light mt-1">Track your recent orders</p>
          </div>
          <Receipt size={20} className="text-himalayan group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
