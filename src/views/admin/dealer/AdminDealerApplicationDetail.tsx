import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  Save,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useAuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { adminDealerApi, type AdminDealerApplicationDetail as ApplicationDetail } from '../../../lib/supabase/api';
import { updateDealerApplicationStatus } from '../../../lib/admin/updateDealerStatusClient';
import { getErrorMessage } from '../../../lib/errors';
import type { DealerApplication, Profile } from '../../../lib/supabase/database.types';

const STATUS_OPTIONS: DealerApplication['status'][] = [
  'pending',
  'under_review',
  'need_more_info',
  'approved',
  'rejected',
  'suspended',
];

const documentLabels: Record<string, string> = {
  reseller_permit: 'Reseller Permit',
  business_license: 'Business License',
  tax_certificate: 'Tax Certificate',
  additional: 'Additional Document',
};

export default function AdminDealerApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuthContext();
  const toast = useToast();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesReps, setSalesReps] = useState<Pick<Profile, 'id' | 'full_name' | 'email'>[]>([]);

  const [statusValue, setStatusValue] = useState<DealerApplication['status']>('pending');
  const [statusReason, setStatusReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [dealerLevel, setDealerLevel] = useState<DealerApplication['dealer_level']>('bronze');
  const [creditTerms, setCreditTerms] = useState(0);
  const [salesRepId, setSalesRepId] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, reps] = await Promise.all([adminDealerApi.getApplication(id), adminDealerApi.listSalesReps()]);
      setApplication(detail);
      setSalesReps(reps);
      if (detail) {
        setStatusValue(detail.status);
        setDealerLevel(detail.dealer_level);
        setCreditTerms(detail.credit_terms);
        setSalesRepId(detail.sales_rep_id || '');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load dealer application.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusSave = async () => {
    if (!id || !session?.access_token) return;
    setStatusSaving(true);
    try {
      await updateDealerApplicationStatus(session.access_token, {
        applicationId: id,
        status: statusValue,
        reason: statusReason || undefined,
      });
      toast.success('Wholesale status updated and notification sent.');
      setStatusReason('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status.'));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!id || !user?.id) return;
    setSettingsSaving(true);
    try {
      await adminDealerApi.updateDealerSettings(id, user.id, {
        dealerLevel,
        creditTerms,
        salesRepId: salesRepId || null,
      });
      toast.success('Wholesale settings updated.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update dealer settings.'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !user?.id || !note.trim()) return;
    setNoteSaving(true);
    try {
      await adminDealerApi.addNote(id, user.id, note.trim());
      setNote('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add note.'));
    } finally {
      setNoteSaving(false);
    }
  };

  const handleVerifyDocument = async (documentId: string, verified: boolean) => {
    if (!user?.id) return;
    try {
      await adminDealerApi.verifyDocument(documentId, user.id, verified);
      toast.success(verified ? 'Document verified.' : 'Document marked unverified.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update document.'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-himalayan" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-20">
        <p className="text-charcoal-light">Application not found.</p>
        <Link to="/admin/dealers/applications" className="text-himalayan font-semibold hover:underline mt-2 inline-block">
          Back to applications
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/dealers/applications" className="inline-flex items-center gap-2 text-charcoal-light hover:text-charcoal text-sm">
        <ArrowLeft size={16} />
        Back to applications
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-charcoal">{application.business_name}</h1>
        <p className="text-charcoal-light">{application.owner_name} · {application.business_email}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Business Info */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Business Information</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label="Business Type" value={application.business_type} />
              <InfoRow label="Years in Business" value={application.years_in_business ? String(application.years_in_business) : undefined} />
              <InfoRow label="Phone" value={application.phone} />
              <InfoRow label="Website" value={application.website} />
              <InfoRow label="Address" value={`${application.address}, ${application.city}, ${application.state} ${application.zip}`} />
              <InfoRow label="Country" value={application.country} />
              <InfoRow label="Monthly Purchase" value={application.monthly_purchase} />
              <InfoRow label="Products Interested" value={application.products_interested?.join(', ')} />
              <InfoRow label="Sales Channels" value={application.sales_channels?.join(', ')} />
            </div>
            {application.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1">Applicant Notes</p>
                <p className="text-sm text-charcoal">{application.notes}</p>
              </div>
            )}
          </section>

          {/* Documents */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Documents</h2>
            <div className="space-y-3">
              {application.dealer_documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-himalayan flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{doc.file_name}</p>
                      <p className="text-xs text-charcoal-light">{documentLabels[doc.document_type] || doc.document_type}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={doc.is_verified ? 'secondary' : 'primary'}
                    onClick={() => handleVerifyDocument(doc.id, !doc.is_verified)}
                    leftIcon={doc.is_verified ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  >
                    {doc.is_verified ? 'Verified' : 'Verify'}
                  </Button>
                </div>
              ))}
              {application.dealer_documents.length === 0 && (
                <p className="text-sm text-charcoal-light">No documents uploaded.</p>
              )}
            </div>
          </section>

          {/* Internal Notes */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Internal Notes</h2>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto scrollbar-thin">
              {application.dealer_notes.map((n) => (
                <div key={n.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                  <p className="text-charcoal">{n.note}</p>
                  <p className="text-xs text-charcoal-light mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
              {application.dealer_notes.length === 0 && (
                <p className="text-sm text-charcoal-light">No internal notes yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an internal note..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
              />
              <Button onClick={handleAddNote} isLoading={noteSaving} disabled={!note.trim()}>
                Add Note
              </Button>
            </div>
          </section>

          {/* Audit History */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Audit History</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {application.dealer_audit_log.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-charcoal capitalize">{entry.action.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-charcoal-light">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              ))}
              {application.dealer_audit_log.length === 0 && (
                <p className="text-sm text-charcoal-light">No activity recorded yet.</p>
              )}
            </div>
          </section>

          {/* Email History */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Email History</h2>
            <div className="space-y-2">
              {application.dealer_emails.map((email) => (
                <div key={email.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                  <Mail size={14} className="text-himalayan flex-shrink-0" />
                  <span className="text-charcoal flex-1">{email.subject}</span>
                  <span className="text-xs text-charcoal-light">{new Date(email.sent_at).toLocaleDateString()}</span>
                </div>
              ))}
              {application.dealer_emails.length === 0 && (
                <p className="text-sm text-charcoal-light">No emails sent yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Application Status</h2>
            <div className="space-y-3">
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as DealerApplication['status'])}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl capitalize focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Reason (included in the email to the dealer)"
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
              />
              <Button onClick={handleStatusSave} isLoading={statusSaving} className="w-full" leftIcon={<Save size={16} />}>
                Update Status & Notify
              </Button>
            </div>
          </section>

          {/* Dealer Settings */}
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-charcoal mb-4">Wholesale Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1.5">Dealer Level</label>
                <select
                  value={dealerLevel}
                  onChange={(e) => setDealerLevel(e.target.value as DealerApplication['dealer_level'])}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl capitalize focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                >
                  {(['bronze', 'silver', 'gold', 'platinum'] as const).map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1.5">Credit Terms (days)</label>
                <input
                  type="number"
                  min={0}
                  value={creditTerms}
                  onChange={(e) => setCreditTerms(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1.5">Sales Representative</label>
                <select
                  value={salesRepId}
                  onChange={(e) => setSalesRepId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                >
                  <option value="">Unassigned</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>{rep.full_name || rep.email}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSettingsSave} isLoading={settingsSaving} className="w-full" leftIcon={<Save size={16} />}>
                Save Settings
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-charcoal-light uppercase tracking-wide">{label}</p>
      <p className="text-charcoal">{value || '—'}</p>
    </div>
  );
}
