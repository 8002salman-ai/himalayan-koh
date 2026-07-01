import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search } from 'lucide-react';
import { Button } from '../../../components/ui';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';
import type { DealerApplication } from '../../../lib/supabase/database.types';

const STATUS_TABS: { label: string; value: DealerApplication['status'] | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Need More Info', value: 'need_more_info' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Suspended', value: 'suspended' },
];

const statusBadge: Record<DealerApplication['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  need_more_info: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-200 text-gray-700',
};

export default function AdminDealerApplications() {
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [status, setStatus] = useState<DealerApplication['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setApplications([]);
      setLoading(false);
      return;
    }

    try {
      setFetchError(null);
      const result = await adminDealerApi.getApplications({ status, search: search || undefined, page, limit: 12 });
      setApplications(result.applications);
      setTotalPages(result.totalPages);
      setTotalCount(result.count);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load dealer applications.'));
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dealer Applications</h1>
        <p className="text-charcoal-light">Review and manage dealer program applications</p>
      </div>

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
            placeholder="Search by business, owner, or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Applications could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <Button variant="destructive" size="sm" onClick={fetchApplications} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} />
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={<Building2 size={40} />}
            title="No dealer applications found"
            description={search ? 'No applications match your search' : 'Dealer applications will appear here once submitted'}
            size="compact"
            className="border-0 shadow-none rounded-none py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{app.business_name}</p>
                      <p className="text-xs text-charcoal-light">{app.owner_name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {app.business_email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[app.status]}`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/dealers/${app.id}`} className="text-sm font-semibold text-himalayan hover:underline">
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
          <span>Showing page {page} of {totalPages} ({totalCount} applications)</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Previous</button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
