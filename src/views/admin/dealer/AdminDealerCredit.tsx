import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Search } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { Button } from '../../../components/ui';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi } from '../../../lib/supabase/api';
import { useAuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';

type Dealer = Awaited<ReturnType<typeof adminDealerApi.getDealers>>['dealers'][number];

const UNPAID_STATUSES = new Set(['pending', 'processing']);

export default function AdminDealerCredit() {
  const { user } = useAuthContext();
  const toast = useToast();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { creditLimit: string; creditTerms: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    try {
      const result = await adminDealerApi.getDealers({ search: search || undefined, limit: 50 });
      setDealers(result.dealers);
      setDrafts(
        Object.fromEntries(
          result.dealers.map((d) => [d.id, { creditLimit: d.credit_limit != null ? String(d.credit_limit) : '', creditTerms: String(d.credit_terms) }])
        )
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load credit data.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (dealerId: string) => {
    if (!user?.id) return;
    const draft = drafts[dealerId];
    setSavingId(dealerId);
    try {
      await adminDealerApi.updateDealerSettings(dealerId, user.id, {
        creditTerms: Number(draft.creditTerms) || 0,
      });
      toast.success('Credit terms updated.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update credit terms.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dealer Management</h1>
        <p className="text-charcoal-light">Credit terms, limits, and outstanding balances by dealer</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dealers..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={5} /></div>
        ) : dealers.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} />} title="No dealers found" size="compact" className="border-0 shadow-none rounded-none py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Dealer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Credit Terms</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Credit Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Total Spend</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dealers.map((dealer) => {
                  const draft = drafts[dealer.id];
                  if (!draft) return null;
                  return (
                    <tr key={dealer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-charcoal">{dealer.business_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-charcoal-light">Net</span>
                          <input
                            type="number"
                            min={0}
                            value={draft.creditTerms}
                            onChange={(e) => setDrafts((d) => ({ ...d, [dealer.id]: { ...d[dealer.id], creditTerms: e.target.value } }))}
                            className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                        {dealer.credit_limit != null ? `$${dealer.credit_limit.toFixed(2)}` : 'Due on receipt'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-charcoal hidden sm:table-cell">${dealer.totalSpend.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => handleSave(dealer.id)} isLoading={savingId === dealer.id}>Save</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-charcoal-light">
        Credit limit is set per-dealer from their application record. Outstanding balance = total unpaid ({Array.from(UNPAID_STATUSES).join(', ')}) orders.
      </p>
    </div>
  );
}
