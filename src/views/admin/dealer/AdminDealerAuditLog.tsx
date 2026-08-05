import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/errors';

type AuditRow = Awaited<ReturnType<typeof adminDealerApi.getAllAuditLog>>['entries'][number];

export default function AdminDealerAuditLog() {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const result = await adminDealerApi.getAllAuditLog({ limit: 50 });
        setEntries(result.entries);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load audit log.'));
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
        <p className="text-charcoal-light">Program-wide audit trail across all dealer applications</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <table className="w-full"><SkeletonTable rows={6} /></table>
        ) : entries.length === 0 ? (
          <EmptyState icon={<History size={40} />} title="No activity recorded yet" size="compact" className="border-0 shadow-none rounded-none py-16" />
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-charcoal capitalize">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-charcoal-light">
                    <Link to={`/admin/dealers/${entry.application.id}`} className="text-himalayan hover:underline">
                      {entry.application.business_name}
                    </Link>
                  </p>
                </div>
                <span className="text-xs text-charcoal-light flex-shrink-0">{new Date(entry.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
