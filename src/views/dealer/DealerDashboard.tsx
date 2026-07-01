import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CreditCard, DollarSign, Package, ShoppingCart, Sparkles, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { dealerApi, dealerUnitPrice, ordersApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { formatCustomerOrderStatus, orderStatusBadgeClass } from '../../lib/orders/status';
import type { DealerApplicationWithDocuments, OrderWithItems, Product } from '../../lib/supabase/database.types';
import { SkeletonDashboard } from '../../components/ui/Skeleton';

const levelColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

const UNPAID_STATUSES = new Set(['pending', 'processing']);

export default function DealerDashboard() {
  const { user, profile } = useAuthContext();
  const [application, setApplication] = useState<DealerApplicationWithDocuments | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const [app, ordersResult, dealerCatalog] = await Promise.all([
          dealerApi.getMyApplication(user.id),
          ordersApi.getUserOrders(user.id),
          dealerApi.getDealerCatalog(),
        ]);
        setApplication(app);
        setOrders(ordersResult.orders);
        setCatalog(dealerCatalog);
      } catch (err) {
        console.error('Failed to load dealer dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) return <SkeletonDashboard />;

  const pendingCount = orders.filter((o) => UNPAID_STATUSES.has(o.status)).length;
  const totalSpend = orders.reduce((sum, o) => sum + o.total, 0);
  const outstanding = orders
    .filter((o) => UNPAID_STATUSES.has(o.status))
    .reduce((sum, o) => sum + o.total, 0);
  const availableCredit = application?.credit_limit != null ? Math.max(application.credit_limit - outstanding, 0) : null;
  const recentOrders = orders.slice(0, 5);
  const featuredProducts = catalog.filter((p) => p.is_featured).slice(0, 3);
  const recommendedProducts = catalog.filter((p) => !p.is_featured).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-charcoal-light">{application?.business_name}</p>
      </div>

      {/* Wholesale Promotion Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-charcoal p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-himalayan/20" />
        <div className="relative flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-himalayan flex items-center justify-center text-white flex-shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Wholesale Promotion</h3>
            <p className="text-white/70 text-sm mt-0.5">
              Order 50+ units this month to qualify for the next dealer tier and better discounts.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={<Award size={18} />} label="Dealer Tier">
          <span
            className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
              levelColors[application?.dealer_level || 'bronze']
            }`}
          >
            {application?.dealer_level || 'Bronze'}
          </span>
        </StatCard>
        <StatCard icon={<ShoppingCart size={18} />} label="Total Orders" value={String(orders.length)} />
        <StatCard icon={<Package size={18} />} label="Pending Orders" value={String(pendingCount)} />
        <StatCard icon={<DollarSign size={18} />} label="Total Spend" value={`$${totalSpend.toFixed(2)}`} />
        <StatCard
          icon={<CreditCard size={18} />}
          label="Available Credit"
          value={availableCredit != null ? `$${availableCredit.toFixed(2)}` : 'Due on receipt'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal">Recent Orders</h2>
            <Link to="/dealer/orders" className="text-sm font-semibold text-himalayan hover:underline flex items-center gap-1">
              View all
              <ChevronRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-charcoal-light">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{order.order_number}</p>
                    <p className="text-xs text-charcoal-light">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${orderStatusBadgeClass(order.status, order.payment_status)}`}>
                      {formatCustomerOrderStatus(order.status, order.payment_status)}
                    </span>
                    <span className="text-sm font-semibold text-charcoal">${order.total.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Featured Products */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal">Featured Products</h2>
            <Link to="/dealer/products" className="text-sm font-semibold text-himalayan hover:underline flex items-center gap-1">
              Browse catalog
              <ChevronRight size={14} />
            </Link>
          </div>
          {featuredProducts.length === 0 ? (
            <p className="text-sm text-charcoal-light">No featured products right now.</p>
          ) : (
            <div className="space-y-2">
              {featuredProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <img
                    src={product.thumbnail || product.images?.[0] || '/images/placeholder-product.svg'}
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal truncate">{product.name}</p>
                    <p className="text-xs text-himalayan font-semibold">${dealerUnitPrice(product).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Products */}
      {recommendedProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-charcoal mb-4">Recommended For You</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {recommendedProducts.map((product) => (
              <Link
                key={product.id}
                to="/dealer/products"
                className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-himalayan/30 hover:shadow-sm transition-all"
              >
                <img
                  src={product.thumbnail || product.images?.[0] || '/images/placeholder-product.svg'}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder-product.svg'; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal truncate">{product.name}</p>
                  <p className="text-xs text-himalayan font-semibold">${dealerUnitPrice(product).toFixed(2)}</p>
                </div>
                <ArrowUpRight size={16} className="text-charcoal-light group-hover:text-himalayan flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, children }: { icon: React.ReactNode; label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="w-9 h-9 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan mb-2">
        {icon}
      </div>
      <p className="text-xs text-charcoal-light uppercase tracking-wide">{label}</p>
      {value && <p className="text-lg font-bold text-charcoal mt-0.5">{value}</p>}
      {children}
    </div>
  );
}
