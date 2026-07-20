import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  ChevronRight,
  Bell,
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

const UNPAID_REQUEST_STATUSES = new Set([
  'submitted',
  'ready_for_review',
  'waiting_stock',
  'stock_verified',
  'approved',
  'payment_pending',
]);

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
        setNotifications(notes.slice(0, 3));
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
  const availableCredit =
    application?.credit_limit != null ? Math.max(application.credit_limit - outstandingBalance, 0) : null;
  const recentRequests = requests.slice(0, 5);
  const featuredProducts = catalog.filter((p) => p.is_featured).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="text-charcoal-light">{application?.business_name}</p>
        </div>
      </div>

      {/* Key stats — only the 4 numbers that matter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList size={18} />} label="Purchase Requests" value={String(requests.length)} />
        <StatCard icon={<Package size={18} />} label="In Progress" value={String(pendingCount)} />
        <StatCard icon={<DollarSign size={18} />} label="Total Spend" value={`$${totalSpend.toFixed(2)}`} />
        <StatCard
          icon={<CreditCard size={18} />}
          label="Available Credit"
          value={availableCredit != null ? `$${availableCredit.toFixed(2)}` : 'Due on receipt'}
        />
      </div>

      {/* Primary action */}
      <Link
        to="/dealer/products"
        className="flex items-center justify-between gap-4 rounded-2xl bg-charcoal p-5 text-white shadow-sm hover:bg-charcoal/90 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-himalayan flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={20} />
          </div>
          <div>
            <p className="font-semibold">Browse Wholesale Catalog</p>
            <p className="text-white/70 text-sm">Submit a new purchase request at your wholesale pricing</p>
          </div>
        </div>
        <ChevronRight size={20} className="flex-shrink-0" />
      </Link>

      {/* Purchase requests — the main activity list */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-charcoal">Recent Purchase Requests</h2>
          <Link
            to="/dealer/purchase-requests"
            className="text-sm font-semibold text-himalayan hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight size={14} />
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <p className="text-sm text-charcoal-light py-4">
            No purchase requests yet — browse the catalog to get started.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentRequests.map((request) => (
              <Link
                key={request.id}
                to={`/dealer/purchase-requests/${request.id}`}
                className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{request.request_number}</p>
                  <p className="text-xs text-charcoal-light">{new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${purchaseRequestStatusBadgeClass(request.status)}`}
                  >
                    {formatPurchaseRequestStatus(request.status)}
                  </span>
                  <span className="text-sm font-semibold text-charcoal">${Number(request.total).toFixed(2)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal">Featured Products</h2>
            <Link
              to="/dealer/products"
              className="text-sm font-semibold text-himalayan hover:underline flex items-center gap-1"
            >
              Browse catalog
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                to="/dealer/products"
                className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-himalayan/30 hover:shadow-sm transition-all"
              >
                <img
                  src={product.thumbnail || product.images?.[0] || '/images/placeholder-product.svg'}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder-product.svg';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal truncate">{product.name}</p>
                  <p className="text-xs text-himalayan font-semibold">${dealerUnitPrice(product).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notifications — compact, only if any */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Bell size={18} className="text-himalayan" />
            Notifications
          </h2>
          <div className="space-y-2">
            {notifications.map((note) => (
              <div key={note.id} className="p-3 rounded-xl bg-gray-50">
                <p className="text-sm font-medium text-charcoal">{note.title}</p>
                <p className="text-xs text-charcoal-light mt-0.5">{note.message}</p>
              </div>
            ))}
          </div>
        </div>
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
