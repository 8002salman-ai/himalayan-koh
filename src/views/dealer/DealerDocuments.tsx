import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileText, Upload } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dealerApi, type DealerDocumentType } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import type { DealerApplicationWithDocuments } from '../../lib/supabase/database.types';
import { SkeletonTable } from '../../components/ui/Skeleton';

const documentLabels: Record<DealerDocumentType, string> = {
  reseller_permit: 'Reseller Permit',
  business_license: 'Business License',
  tax_certificate: 'Tax Certificate',
  additional: 'Additional Document',
};

export default function DealerDocuments() {
  const { user } = useAuthContext();
  const toast = useToast();
  const [application, setApplication] = useState<DealerApplicationWithDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const app = await dealerApi.getMyApplication(user.id);
      setApplication(app);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleUpload = async (file: File | null) => {
    if (!file || !application || !user?.id) return;
    setUploading(true);
    try {
      await dealerApi.uploadDocument(application.id, user.id, file, 'additional');
      toast.success('Document uploaded.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload document.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Documents</h1>
        <p className="text-charcoal-light">Documents submitted with your wholesale application</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <table className="w-full">
            <SkeletonTable rows={3} />
          </table>
        ) : (
          <div className="divide-y divide-gray-100">
            {(application?.dealer_documents || []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-himalayan-lighter rounded-xl flex items-center justify-center text-himalayan flex-shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal truncate">{doc.file_name}</p>
                    <p className="text-xs text-charcoal-light">{documentLabels[doc.document_type]}</p>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    doc.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {doc.is_verified ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {doc.is_verified ? 'Verified' : 'Pending Review'}
                </span>
              </div>
            ))}
            {(!application?.dealer_documents || application.dealer_documents.length === 0) && (
              <p className="p-6 text-center text-sm text-charcoal-light">No documents on file.</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-charcoal mb-3">Upload Additional Document</h2>
        <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-charcoal-light cursor-pointer hover:border-himalayan/40 transition-colors w-fit">
          <Upload size={16} />
          {uploading ? 'Uploading...' : 'Choose file (PDF, PNG, JPG)'}
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files?.[0] || null)}
          />
        </label>
      </div>
    </div>
  );
}
