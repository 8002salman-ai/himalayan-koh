import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import DealerManagementTabs from '../../../components/admin/dealer/DealerManagementTabs';
import { Button } from '../../../components/ui';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { adminDealerApi } from '../../../lib/supabase/api';
import { useAuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getErrorMessage } from '../../../lib/errors';

type DocRow = Awaited<ReturnType<typeof adminDealerApi.getAllDocuments>>['documents'][number];

const documentLabels: Record<string, string> = {
  reseller_permit: 'Reseller Permit',
  business_license: 'Business License',
  tax_certificate: 'Tax Certificate',
  additional: 'Additional Document',
};

export default function AdminDealerDocuments() {
  const { user } = useAuthContext();
  const toast = useToast();
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    try {
      const result = await adminDealerApi.getAllDocuments({
        verified: filter === 'all' ? undefined : filter === 'verified',
        limit: 50,
      });
      setDocuments(result.documents);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load documents.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (documentId: string, verified: boolean) => {
    if (!user?.id) return;
    try {
      await adminDealerApi.verifyDocument(documentId, user.id, verified);
      toast.success(verified ? 'Document verified.' : 'Marked unverified.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update document.'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Dealer Management</h1>
        <p className="text-charcoal-light">All dealer documents across every application</p>
      </div>

      <DealerManagementTabs />

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'verified'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-himalayan text-white' : 'bg-gray-100 text-charcoal-light hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonTable rows={5} /></div>
        ) : documents.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="No documents found" size="compact" className="border-0 shadow-none rounded-none py-16" />
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="text-himalayan flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{doc.file_name}</p>
                    <p className="text-xs text-charcoal-light">
                      {documentLabels[doc.document_type] || doc.document_type} ·{' '}
                      <Link to={`/admin/dealers/${doc.application.id}`} className="text-himalayan hover:underline">
                        {doc.application.business_name}
                      </Link>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={doc.is_verified ? 'secondary' : 'primary'}
                  onClick={() => handleVerify(doc.id, !doc.is_verified)}
                  leftIcon={doc.is_verified ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                >
                  {doc.is_verified ? 'Verified' : 'Verify'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
