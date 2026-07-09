import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  DollarSign,
  MapPin,
  Package,
  Percent,
  Phone,
  ShoppingCart,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { dealerApi, dealerUnitPrice, notificationsApi } from '../../lib/supabase/api';
import { wholesalePurchaseRequestApi } from '../../lib/supabase/api/wholesale';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { formatPurchaseRequestStatus, purchaseRequestStatusBadgeClass } from '../../lib/wholesale/status';
import type {
  DealerApplicationWithDocuments,
  Notification,
  Product,
  WholesalePurchaseRequestWithItems,
} from '../../lib/supabase/database.types';
import { SkeletonDashboard } from '../../components/ui/Skeleton';

const levelColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

const UNPAID_REQUEST_STATUSES = new Set(['submitted', 'ready_for_review', 'waiting_stock', 'stock_verified', 'approved', 'payment_pending']);

export default function DealerDashboard() {
  const { user, profile } = useAuthContext();
  const [application, setApplication] = useState<DealerApplicationWithDocuments | null>(null);
  const [requests, setRequests] = useState<WholesalePurchaseRequestWithItems[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const [app, requestsResult, dealerCatalog, notes] = await Promise.all([
          dealerApi.getMyApplication(user.id),
          wholesalePurchaseRequestApi.getMyRequests(user.id),
          dealerApi.getDealerCatalog(),
          notificationsApi.getNotifications(user.id).catch(() => []),
        ]);
        setApplication(app);
        setRequests(requestsResult);
        setCatalog(dealerCatalog);
        setNotifications(notes.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dealer dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) return <SkeletonDashboard />;

  const pendingCount = requests.filter((r) => UNPAID_REQUEST_STATUSES.has(r.status)).length;
  const totalSpend = requests.reduce((sum, r) => sum + Number(r.total), 0);
  const outstandingBalance = requests
    .filter((r) => UNPAID_REQUEST_STATUSES.has(r.status))
    .reduce((sum, r) => sum + Number(r.total), 0);
  const availableCredit = application?.credit_limit != null ? Math.max(application.credit_limit - outstandingBalance, 0) : null;
  const recentRequests = requests.slice(0, 5);
  const featuredProducts = catalog.filter((p) => p.is_featured).slice(0, 3);
  const recommendedProducts = catalog.filter((p) => !p.is_featured).slice(0, 3);

  const discountedProducts = catalog.filter((p) => p.dealer_price != null && p.dealer_price < p.price);
  const avgDiscountPct =
    discountedProducts.length > 0
      ? (discountedProducts.reduce((sum, p) => sum + (1 - p.dealer_price! / p.price), 0) / discountedProducts.length) * 100
      : 0;

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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={<Award size={18} />} label="Dealer Tier">
          <span
            className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
              levelColors[application?.dealer_level || 'bronze']
            }`}
          >
            {application?.dealer_level || 'Bronze'}
          </span>
        </StatCard>
        <StatCard icon={<Percent size={18} />} label="Current Discount" value={avgDiscountPct > 0 ? `${avgDiscountPct.toFixed(0)}% off` : '—'} />
        <StatCard icon={<ClipboardList size={18} />} label="Purchase Requests" value={String(requests.length)} />
        <StatCard icon={<Package size={18} />} label="In Progress" value={String(pendingCount)} />
        <StatCard icon={<DollarSign size={18} />} label="Total Spend" value={`$${totalSpend.toFixed(2)}`} />
        <StatCard icon={<CreditCard size={18} />} label="Available Credit" value={availableCredit != null ? `$${availableCredit.toFixed(2)}` : 'Due on receipt'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal">Company Information</h2>
            <Link to="/dealer/profile" className="text-sm font-semibold text-himalayan hover:underline flex items-center gap-1">
              Edit
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-himalayan flex-shrink-0" />
              <span className="text-sm text-charcoal">{application?.business_name} · <span className="text-charcoal-light">{application?.business_type}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-himalayan flex-shrink-0" />
              <span className="text-sm text-charcoal-light">{application?.city}, {application?.state}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-himalayan flex-shrink-0" />
              <span className="text-sm text-charcoal-light">{application?.phone}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-charcoal-light">Outstanding Balance</span>
              <span className="text-sm font-semibold text-charcoal">${outstandingBalance.toFixed(2)}</span>
            </div>
            {application?.tax_exempt && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                Tax Exempt
              </span>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Bell size={18} className="text-himalayan" />
            Notifications
          </h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-charcoal-light">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((note) => (
                <div key={note.id} className="p-3 rounded-xl bg-gray-50">
                  <p className="text-sm font-medium text-charcoal">{note.title}</p>
                  <p className="text-xs text-charcoal-light mt-0.5">{note.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Purchase Requests — the primary activity view for this dashboard */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal">Purchase Requests</h2>
            <Link to="/dealer/purchase-requests" className="text-sm font-semibold text-himalayan hover:underline flex items-center gap-1">
              View all
              <ChevronRight size={14} />
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-charcoal-light">No purchase requests yet — browse the catalog to get started.</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  to={`/dealer/purchase-requests/${request.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{request.request_number}</p>
                    <p className="text-xs text-charcoal-light">{new Date(request.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${purchaseRequestStatusBadgeClass(request.status)}`}>
                      {formatPurchaseRequestStatus(request.status)}
                    </span>
                    <span className="text-sm font-semibold text-charcoal">${Number(request.total).toFixed(2)}</span>
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

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Link to="/dealer/products" className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow text-center">
          <ShoppingCart size={20} className="text-himalayan mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal">Submit Purchase Request</p>
        </Link>
        <Link to="/dealer/orders" className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow text-center">
          <Package size={20} className="text-himalayan mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal">Converted Orders</p>
        </Link>
        <Link to="/dealer/invoices" className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow text-center">
          <DollarSign size={20} className="text-himalayan mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal">View Invoices</p>
        </Link>
        <Link to="/dealer/support" className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow text-center">
          <Bell size={20} className="text-himalayan mx-auto mb-2" />
          <p className="text-sm font-semibold text-charcoal">Contact Support</p>
        </Link>
      </div>
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
