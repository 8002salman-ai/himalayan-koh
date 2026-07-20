import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi } from '../../../lib/supabase/api';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { useToast } from '../../../context/ToastContext';
import { getErrorMessage } from '../../../lib/errors';

type EmailRow = Awaited<ReturnType<typeof adminDealerApi.getAllEmails>>['emails'][number];

export default function AdminDealerCommunication() {
  const toast = useToast();
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const result = await adminDealerApi.getAllEmails({ limit: 50 });
        setEmails(result.emails);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load communication history.'));
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
        <p className="text-charcoal-light">Email history sent to dealers across the program</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={5} /></div>
        ) : emails.length === 0 ? (
          <EmptyState icon={<Mail size={40} />} title="No emails sent yet" description="Status-change emails to dealers will appear here." size="compact" className="border-0 shadow-none rounded-none py-16" />
        ) : (
          <div className="divide-y divide-gray-100">
            {emails.map((email) => (
              <div key={email.id} className="flex items-center gap-3 p-4">
                <Mail size={16} className="text-himalayan flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal truncate">{email.subject}</p>
                  <p className="text-xs text-charcoal-light">
                    To {email.sent_to} ·{' '}
                    <Link to={`/admin/dealers/${email.application.id}`} className="text-himalayan hover:underline">
                      {email.application.business_name}
                    </Link>
                  </p>
                </div>
                <span className="text-xs text-charcoal-light flex-shrink-0">{new Date(email.sent_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
