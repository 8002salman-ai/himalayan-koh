import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { authApi, dealerApi } from '../../lib/supabase/api';
import { getErrorMessage } from '../../lib/errors';

interface FormState {
  businessName: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  address: string;
  country: string;
  password: string;
  confirmPassword: string;
  notes: string;
}

const initialForm: FormState = {
  businessName: '',
  ownerName: '',
  businessEmail: '',
  phone: '',
  address: '',
  country: 'United States',
  password: '',
  confirmPassword: '',
  notes: '',
};

export default function DealerRegisterPage() {
  const { isAuthenticated, user, signUp } = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [resellerCertificate, setResellerCertificate] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!form.businessName.trim()) return 'Please enter your business name.';
    if (!form.ownerName.trim()) return 'Please enter the owner name.';
    if (!form.businessEmail.trim()) return 'Please enter your email.';
    if (!form.phone.trim()) return 'Please enter your phone number.';
    if (!form.address.trim()) return 'Please enter your business address.';
    if (!form.country.trim()) return 'Please enter your country.';
    if (!resellerCertificate) return 'Please upload your reseller certificate.';
    if (!isAuthenticated) {
      if (form.password.length < 6) return 'Password must be at least 6 characters.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let userId = user?.id;

      if (!isAuthenticated) {
        await signUp({ email: form.businessEmail, password: form.password, fullName: form.ownerName });
        const { user: newUser } = await authApi.signIn({ email: form.businessEmail, password: form.password });
        userId = newUser?.id;
      }

      if (!userId) throw new Error('Unable to create your wholesale account. Please try again.');

      // NOTE: business_type / state / city / zip are required (NOT NULL) columns
      // on the existing dealer_applications table but are no longer collected in
      // the simplified wholesale application. We send empty strings so the
      // database schema and admin APIs stay unchanged.
      const application = await dealerApi.submitApplication(userId, {
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        businessEmail: form.businessEmail.trim(),
        phone: form.phone.trim(),
        businessType: '',
        country: form.country.trim(),
        state: '',
        city: '',
        zip: '',
        address: form.address.trim(),
        productsInterested: [],
        salesChannels: [],
        notes: form.notes.trim() || undefined,
      });

      if (resellerCertificate) {
        await dealerApi.uploadDocument(application.id, userId, resellerCertificate, 'reseller_permit');
      }

      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit your wholesale application. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-himalayan/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-himalayan" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white mb-3">Application Submitted</h1>
          <p className="text-white/70 mb-8 leading-relaxed">
            Thank you for applying to become a Himalayan Koh wholesale partner. Our team will review your
            application, and you&apos;ll receive an email once a decision is made.
          </p>
          <button onClick={() => navigate('/dealer/login')} className="btn-hk-primary">
            Go to Wholesale Login
            <ArrowRight size={16} className="ml-2" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white py-8 md:py-14 px-4">
      <div className="max-w-lg mx-auto">
        <Link to="/dealer" className="inline-flex items-center gap-2 text-charcoal-light hover:text-charcoal mb-6 transition-colors">
          <ArrowLeft size={18} />
          Back to Wholesale Program
        </Link>

        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Himalayan Koh" className="h-12 mx-auto mb-4" />
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-charcoal">Wholesale Application</h1>
          <p className="text-charcoal-light text-sm mt-1">
            Fill in a few details and upload your reseller certificate. It only takes a minute.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-black/5 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          <Field label="Business Name" required value={form.businessName} onChange={(v) => update('businessName', v)} />
          <Field label="Owner Name" required value={form.ownerName} onChange={(v) => update('ownerName', v)} />
          <Field
            label="Email"
            required
            type="email"
            value={form.businessEmail}
            onChange={(v) => update('businessEmail', v)}
            disabled={isAuthenticated}
          />
          <Field label="Phone" required type="tel" value={form.phone} onChange={(v) => update('phone', v)} />
          <Field label="Business Address" required value={form.address} onChange={(v) => update('address', v)} placeholder="Street, City, State, ZIP" />
          <Field label="Country" required value={form.country} onChange={(v) => update('country', v)} />

          <FileField
            label="Reseller Certificate"
            required
            file={resellerCertificate}
            onChange={setResellerCertificate}
          />

          {!isAuthenticated && (
            <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
              <Field label="Password" required type="password" value={form.password} onChange={(v) => update('password', v)} />
              <Field label="Confirm Password" required type="password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} />
            </div>
          )}

          <TextAreaField label="Notes (optional)" value={form.notes} onChange={(v) => update('notes', v)} />

          <button type="submit" disabled={submitting} className="btn-hk-primary w-full justify-center disabled:opacity-70">
            {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
            Submit Application
          </button>

          <p className="text-center text-sm text-charcoal-light">
            Already have an account?{' '}
            <Link to="/dealer/login" className="text-himalayan font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-1.5">
        {label} {required && <span className="text-himalayan">*</span>}
      </label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all disabled:opacity-60"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-1.5">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all resize-none"
      />
    </div>
  );
}

function FileField({
  label,
  file,
  onChange,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-1.5">
        {label} {required && <span className="text-himalayan">*</span>}
      </label>
      {file ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-himalayan-lighter border border-himalayan/20 rounded-xl">
          <span className="flex items-center gap-2 text-sm text-charcoal truncate">
            <FileText size={16} className="text-himalayan flex-shrink-0" />
            <span className="truncate">{file.name}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-charcoal-light hover:text-red-500 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-charcoal-light cursor-pointer hover:border-himalayan/40 transition-colors">
          <Upload size={16} />
          Choose file (PDF, PNG, JPG)
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );
}
