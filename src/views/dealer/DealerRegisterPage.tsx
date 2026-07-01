import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { authApi, dealerApi, type DealerDocumentType } from '../../lib/supabase/api';
import { getErrorMessage } from '../../lib/errors';

const STEPS = ['Business Information', 'Business Address', 'Documents', 'Business Details', 'Review'];

const BUSINESS_TYPES = ['LLC', 'Corporation', 'Sole Proprietorship', 'Partnership', 'Individual'];
const PRODUCT_OPTIONS = ['Salt Lick for Horses', 'Salt Blocks for Deer', 'Salt for Cattle', 'Edible Cooking Salt'];
const SALES_CHANNEL_OPTIONS = ['Store', 'Marketplace', 'Website', 'Other'];
const DOCUMENT_FIELDS: { type: DealerDocumentType; label: string; required: boolean }[] = [
  { type: 'reseller_permit', label: 'Reseller Permit', required: true },
  { type: 'business_license', label: 'Business License', required: true },
  { type: 'tax_certificate', label: 'Tax Certificate', required: true },
  { type: 'additional', label: 'Additional Documents', required: false },
];

interface FormState {
  businessName: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  website: string;
  businessType: string;
  yearsInBusiness: string;
  password: string;
  confirmPassword: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  address: string;
  monthlyPurchase: string;
  productsInterested: string[];
  salesChannels: string[];
  notes: string;
}

const initialForm: FormState = {
  businessName: '',
  ownerName: '',
  businessEmail: '',
  phone: '',
  website: '',
  businessType: '',
  yearsInBusiness: '',
  password: '',
  confirmPassword: '',
  country: 'United States',
  state: '',
  city: '',
  zip: '',
  address: '',
  monthlyPurchase: '',
  productsInterested: [],
  salesChannels: [],
  notes: '',
};

export default function DealerRegisterPage() {
  const { isAuthenticated, user, signUp } = useAuthContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [documents, setDocuments] = useState<Partial<Record<DealerDocumentType, File>>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleListValue = (key: 'productsInterested' | 'salesChannels', value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.businessName || !form.ownerName || !form.businessEmail || !form.phone || !form.businessType) {
        return 'Please fill in all required business information fields.';
      }
      if (!isAuthenticated) {
        if (form.password.length < 6) return 'Password must be at least 6 characters.';
        if (form.password !== form.confirmPassword) return 'Passwords do not match.';
      }
    }
    if (step === 1) {
      if (!form.country || !form.state || !form.city || !form.zip || !form.address) {
        return 'Please fill in your complete business address.';
      }
    }
    if (step === 2) {
      if (!documents.reseller_permit || !documents.business_license || !documents.tax_certificate) {
        return 'Reseller permit, business license, and tax certificate are required.';
      }
    }
    return null;
  };

  const goNext = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFileChange = (type: DealerDocumentType, file: File | null) => {
    setDocuments((prev) => {
      const next = { ...prev };
      if (file) next[type] = file;
      else delete next[type];
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      let userId = user?.id;

      if (!isAuthenticated) {
        await signUp({ email: form.businessEmail, password: form.password, fullName: form.ownerName });
        const { user: newUser } = await authApi.signIn({ email: form.businessEmail, password: form.password });
        userId = newUser?.id;
      }

      if (!userId) throw new Error('Unable to create your dealer account. Please try again.');

      const application = await dealerApi.submitApplication(userId, {
        businessName: form.businessName,
        ownerName: form.ownerName,
        businessEmail: form.businessEmail,
        phone: form.phone,
        website: form.website || undefined,
        businessType: form.businessType,
        yearsInBusiness: form.yearsInBusiness ? Number(form.yearsInBusiness) : undefined,
        country: form.country,
        state: form.state,
        city: form.city,
        zip: form.zip,
        address: form.address,
        monthlyPurchase: form.monthlyPurchase || undefined,
        productsInterested: form.productsInterested,
        salesChannels: form.salesChannels,
        notes: form.notes || undefined,
      });

      for (const field of DOCUMENT_FIELDS) {
        const file = documents[field.type];
        if (file) {
          await dealerApi.uploadDocument(application.id, userId, file, field.type);
        }
      }

      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit your dealer application. Please try again.'));
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
            Thank you for applying to become a Himalayan Koh dealer. Our team will review your application and
            documents, and you'll receive an email once a decision is made.
          </p>
          <button onClick={() => navigate('/dealer/login')} className="btn-hk-primary">
            Go to Dealer Login
            <ArrowRight size={16} className="ml-2" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white py-8 md:py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/dealer" className="inline-flex items-center gap-2 text-charcoal-light hover:text-charcoal mb-6 transition-colors">
          <ArrowLeft size={18} />
          Back to Dealer Program
        </Link>

        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Himalayan Koh" className="h-12 mx-auto mb-4" />
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-charcoal">Dealer Application</h1>
          <p className="text-charcoal-light text-sm mt-1">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-himalayan' : 'bg-himalayan-line'}`} />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <Field label="Business Name" required value={form.businessName} onChange={(v) => update('businessName', v)} />
                  <Field label="Owner Name" required value={form.ownerName} onChange={(v) => update('ownerName', v)} />
                  <Field label="Business Email" required type="email" value={form.businessEmail} onChange={(v) => update('businessEmail', v)} disabled={isAuthenticated} />
                  <Field label="Phone" required type="tel" value={form.phone} onChange={(v) => update('phone', v)} />
                  <Field label="Website" value={form.website} onChange={(v) => update('website', v)} />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <SelectField
                      label="Business Type"
                      required
                      value={form.businessType}
                      onChange={(v) => update('businessType', v)}
                      options={BUSINESS_TYPES}
                    />
                    <Field label="Years in Business" type="number" value={form.yearsInBusiness} onChange={(v) => update('yearsInBusiness', v)} />
                  </div>
                  {!isAuthenticated && (
                    <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                      <Field label="Account Password" required type="password" value={form.password} onChange={(v) => update('password', v)} />
                      <Field label="Confirm Password" required type="password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} />
                    </div>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Country" required value={form.country} onChange={(v) => update('country', v)} />
                    <Field label="State" required value={form.state} onChange={(v) => update('state', v)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="City" required value={form.city} onChange={(v) => update('city', v)} />
                    <Field label="ZIP Code" required value={form.zip} onChange={(v) => update('zip', v)} />
                  </div>
                  <Field label="Street Address" required value={form.address} onChange={(v) => update('address', v)} />
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-sm text-charcoal-light -mt-1 mb-2">
                    Accepted formats: PDF, PNG, JPG. Reseller permit, business license, and tax certificate are required.
                  </p>
                  {DOCUMENT_FIELDS.map((field) => (
                    <FileField
                      key={field.type}
                      label={field.label}
                      required={field.required}
                      file={documents[field.type]}
                      onChange={(file) => handleFileChange(field.type, file)}
                    />
                  ))}
                </>
              )}

              {step === 3 && (
                <>
                  <Field label="Estimated Monthly Purchase" value={form.monthlyPurchase} onChange={(v) => update('monthlyPurchase', v)} placeholder="e.g. $1,000 - $5,000" />
                  <CheckboxGroup
                    label="Products Interested In"
                    options={PRODUCT_OPTIONS}
                    selected={form.productsInterested}
                    onToggle={(v) => toggleListValue('productsInterested', v)}
                  />
                  <CheckboxGroup
                    label="Sales Channels"
                    options={SALES_CHANNEL_OPTIONS}
                    selected={form.salesChannels}
                    onToggle={(v) => toggleListValue('salesChannels', v)}
                  />
                  <TextAreaField label="Notes" value={form.notes} onChange={(v) => update('notes', v)} />
                </>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <ReviewSection title="Business Information">
                    <ReviewRow label="Business Name" value={form.businessName} />
                    <ReviewRow label="Owner Name" value={form.ownerName} />
                    <ReviewRow label="Email" value={form.businessEmail} />
                    <ReviewRow label="Phone" value={form.phone} />
                    <ReviewRow label="Business Type" value={form.businessType} />
                  </ReviewSection>
                  <ReviewSection title="Address">
                    <ReviewRow label="Address" value={`${form.address}, ${form.city}, ${form.state} ${form.zip}`} />
                    <ReviewRow label="Country" value={form.country} />
                  </ReviewSection>
                  <ReviewSection title="Documents">
                    {DOCUMENT_FIELDS.map((field) => (
                      <ReviewRow key={field.type} label={field.label} value={documents[field.type]?.name || 'Not uploaded'} />
                    ))}
                  </ReviewSection>
                  <ReviewSection title="Business Details">
                    <ReviewRow label="Monthly Purchase" value={form.monthlyPurchase || '—'} />
                    <ReviewRow label="Products" value={form.productsInterested.join(', ') || '—'} />
                    <ReviewRow label="Sales Channels" value={form.salesChannels.join(', ') || '—'} />
                  </ReviewSection>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="px-5 py-3 rounded-xl font-semibold text-sm text-charcoal-light hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="btn-hk-primary">
                Continue
                <ArrowRight size={16} className="ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-hk-primary disabled:opacity-70"
              >
                {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                Submit Application
              </button>
            )}
          </div>
        </div>
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
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all resize-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-1.5">
        {label} {required && <span className="text-himalayan">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
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
  file: File | undefined;
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

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-2">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-charcoal cursor-pointer hover:border-himalayan/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h3 className="font-semibold text-charcoal text-sm mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-charcoal-light">{label}</span>
      <span className="text-charcoal font-medium text-right">{value || '—'}</span>
    </div>
  );
}
