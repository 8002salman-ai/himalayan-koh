import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { formatPurchaseRequestStatus, purchaseRequestStatusBadgeClass } from '../../lib/wholesale/status';
import { useAuthContext } from '../../context/AuthContext';
import { wholesalePurchaseRequestApi } from '../../lib/supabase/api/wholesale';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { WholesalePurchaseRequestWithItems } from '../../lib/supabase/database.types';
import { SkeletonOrderList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function DealerPurchaseRequests() {
  const { user } = useAuthContext();
  const [requests, setRequests] = useState<WholesalePurchaseRequestWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const result = await wholesalePurchaseRequestApi.getMyRequests(user.id);
        setRequests(result);
      } catch (err) {
        console.error('Failed to load purchase requests:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Purchase Requests</h1>
          <p className="text-charcoal-light">Track your wholesale purchase requests and proforma invoices</p>
        </div>
        <Link
          to="/dealer/products"
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
        >
          <Plus size={16} /> New Request
        </Link>
      </div>

      {loading ? (
        <SkeletonOrderList count={3} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="No purchase requests yet"
          description="Submit a purchase request from the wholesale catalog to get a proforma invoice and stock verification."
          action={{ label: 'Browse Catalog', href: '/dealer/products' }}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/dealer/purchase-requests/${request.id}`}
              className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan flex-shrink-0">
                  <ClipboardList size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-charcoal truncate">{request.request_number}</p>
                  <p className="text-xs text-charcoal-light">
                    {new Date(request.created_at).toLocaleDateString()} · {request.wholesale_purchase_request_items?.length || 0} item(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${purchaseRequestStatusBadgeClass(request.status)}`}>
                  {formatPurchaseRequestStatus(request.status)}
                </span>
                <span className="font-bold text-charcoal hidden sm:block">${Number(request.total).toFixed(2)}</span>
                <ChevronRight size={18} className="text-charcoal-light" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
