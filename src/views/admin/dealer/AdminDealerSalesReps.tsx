import { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/errors';
import type { DealerApplication, Profile } from '../../../lib/supabase/database.types';

export default function AdminDealerSalesReps() {
  const toast = useToast();
  const [reps, setReps] = useState<Pick<Profile, 'id' | 'full_name' | 'email'>[]>([]);
  const [dealers, setDealers] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const [repList, dealerResult] = await Promise.all([
          adminDealerApi.listSalesReps(),
          adminDealerApi.getDealers({ limit: 100 }),
        ]);
        setReps(repList);
        setDealers(dealerResult.dealers);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load sales representatives.'));
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
        <p className="text-charcoal-light">Admin staff eligible as dealer sales representatives</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={3} /></div>
        ) : reps.length === 0 ? (
          <EmptyState icon={<UserCheck size={40} />} title="No sales representatives" description="Admin accounts can be assigned as sales reps from a dealer's record." size="compact" className="border-0 shadow-none rounded-none py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Representative</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Assigned Dealers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reps.map((rep) => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-charcoal">{rep.full_name || 'Unnamed admin'}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">{rep.email}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-light">
                      {dealers.filter((d) => d.sales_rep_id === rep.id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
