import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/errors';

const LEVELS = [
  { key: 'bronze', label: 'Bronze', color: 'bg-amber-100 text-amber-700', description: 'Entry-level dealer tier.' },
  { key: 'silver', label: 'Silver', color: 'bg-gray-200 text-gray-700', description: 'Established dealer with steady volume.' },
  { key: 'gold', label: 'Gold', color: 'bg-yellow-100 text-yellow-700', description: 'High-volume dealer with priority terms.' },
  { key: 'platinum', label: 'Platinum', color: 'bg-purple-100 text-purple-700', description: 'Top-tier strategic dealer partner.' },
] as const;

export default function AdminDealerLevels() {
  const toast = useToast();
  const [byLevel, setByLevel] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const stats = await adminDealerApi.getDashboardStats();
        setByLevel(stats.byLevel);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load dealer levels.'));
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
        <p className="text-charcoal-light">Wholesale tier distribution and definitions</p>
      </div>

      <DealerManagementTabs />

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-4"><SkeletonTable rows={4} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LEVELS.map((level) => (
            <div key={level.key} className="bg-white rounded-2xl shadow-sm p-6">
              <div className="w-10 h-10 rounded-xl bg-himalayan-lighter flex items-center justify-center text-himalayan mb-3">
                <Award size={18} />
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${level.color}`}>
                {level.label}
              </span>
              <p className="text-2xl font-bold text-charcoal mt-3">{byLevel?.[level.key] ?? 0}</p>
              <p className="text-xs text-charcoal-light">dealers at this tier</p>
              <p className="text-sm text-charcoal-light mt-3">{level.description}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-charcoal-light">
        Assign or change a dealer's level from their record in{' '}
        <Link to="/admin/dealers/dealers" className="text-himalayan font-semibold hover:underline">Dealers</Link>.
      </p>
    </div>
  );
}
