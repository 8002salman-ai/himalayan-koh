import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dealerApi } from '../../lib/supabase/api';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import type { DealerApplicationWithDocuments } from '../../lib/supabase/database.types';

export default function DealerProfile() {
  const { user, profile, updateProfile } = useAuthContext();
  const toast = useToast();
  const [application, setApplication] = useState<DealerApplicationWithDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const app = await dealerApi.getMyApplication(user.id);
        setApplication(app);
        setPhone(app?.phone || '');
        setWebsite(app?.website || '');
      } catch (err) {
        console.error('Failed to load dealer profile:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile?.full_name]);

  const handleSave = async () => {
    if (!application) return;
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName, phone });
      await dealerApi.updateContactInfo(application.id, { phone, website: website || null });
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-himalayan" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Profile</h1>
        <p className="text-charcoal-light">Manage your dealer account details</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-charcoal">Contact Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">Website</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
        <h2 className="font-semibold text-charcoal mb-2">Business Information</h2>
        <ReadOnlyRow label="Business Name" value={application?.business_name} />
        <ReadOnlyRow label="Business Type" value={application?.business_type} />
        <ReadOnlyRow label="Address" value={application ? `${application.address}, ${application.city}, ${application.state} ${application.zip}` : undefined} />
        <ReadOnlyRow label="Dealer Level" value={application?.dealer_level} capitalize />
        <ReadOnlyRow label="Credit Terms" value={application?.credit_terms ? `Net ${application.credit_terms}` : 'Due on receipt'} />
        <p className="text-xs text-charcoal-light pt-2">
          To change your business name, type, or address, please contact support.
        </p>
      </div>
    </div>
  );
}

function ReadOnlyRow({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-charcoal-light">{label}</span>
      <span className={`text-charcoal font-medium text-right ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</span>
    </div>
  );
}
