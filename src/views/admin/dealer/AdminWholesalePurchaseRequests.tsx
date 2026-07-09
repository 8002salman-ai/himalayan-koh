import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search } from 'lucide-react';
import { Button } from '../../../components/ui';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { adminWholesaleApi, type AdminPurchaseRequestListRow } from '../../../lib/supabase/api/adminWholesale';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';
import { formatPurchaseRequestStatus, purchaseRequestStatusBadgeClass } from '../../../lib/wholesale/status';
import type { WholesalePurchaseRequest } from '../../../lib/supabase/database.types';

const STATUS_TABS: { label: string; value: WholesalePurchaseRequest['status'] | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Waiting for Stock', value: 'waiting_stock' },
  { label: 'Approved', value: 'approved' },
  { label: 'Changes Requested', value: 'changes_requested' },
  { label: 'Payment Pending', value: 'payment_pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Converted', value: 'converted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 12;

export default function AdminWholesalePurchaseRequests() {
  const [requests, setRequests] = useState<AdminPurchaseRequestListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [status, setStatus] = useState<WholesalePurchaseRequest['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setFetchError(null);
      const result = await adminWholesaleApi.getRequests({
        status: status === 'all' ? undefined : status,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setRequests(result.requests);
      setTotalCount(result.count);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load purchase requests.'));
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Wholesale Purchase Requests</h1>
        <p className="text-charcoal-light">Review stock, approve, and convert dealer purchase requests into orders</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                status === tab.value
                  ? 'bg-himalayan text-white'
                  : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by request number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Purchase requests could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <Button variant="destructive" size="sm" onClick={fetchRequests} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={40} />}
            title="No purchase requests found"
            description={search ? 'No requests match your search' : 'Dealer purchase requests will appear here once submitted'}
            size="compact"
            className="border-0 shadow-none rounded-none py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Dealer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{req.request_number}</p>
                      <p className="text-xs text-charcoal-light">{req.wholesale_purchase_request_items?.length || 0} item(s)</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {req.dealer_application?.business_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${purchaseRequestStatusBadgeClass(req.status)}`}>
                        {formatPurchaseRequestStatus(req.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      ${Number(req.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/dealers/purchase-requests/${req.id}`} className="text-sm font-semibold text-himalayan hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-charcoal-light">
          <span>Showing page {page} of {totalPages} ({totalCount} requests)</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Previous</button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
