import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useCart } from '../../store/cartStore';
import { useToast } from '../../context/ToastContext';
import { wholesalePurchaseRequestApi } from '../../lib/supabase/api/wholesale';
import { getErrorMessage } from '../../lib/errors';

const inputClass =
  'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all';
const labelClass = 'block text-sm font-semibold text-charcoal mb-1.5';

const initialForm = {
  fullName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
  dealerPoReference: '',
  dealerNotes: '',
};

export default function DealerCheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const request = await wholesalePurchaseRequestApi.createPurchaseRequest({
        shippingAddress: {
          fullName: form.fullName,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        dealerPoReference: form.dealerPoReference || undefined,
        dealerNotes: form.dealerNotes || undefined,
      });
      await clearCart();
      toast.success(`Purchase request ${request.request_number} submitted.`);
      navigate(`/dealer/purchase-requests/${request.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to submit purchase request.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ClipboardCheck size={40} className="mx-auto text-charcoal-light mb-4" />
        <h1 className="text-xl font-bold text-charcoal mb-2">Your cart is empty</h1>
        <p className="text-charcoal-light mb-6">Add products from the dealer catalog before submitting a purchase request.</p>
        <Link to="/dealer/products" className="text-himalayan font-semibold hover:underline">
          Browse dealer catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dealer/products" className="text-charcoal-light hover:text-charcoal">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Submit Purchase Request</h1>
          <p className="text-charcoal-light text-sm">
            This creates a proforma invoice for review — it is not a paid order. Our team verifies stock before it is
            approved. No payment is required at this step.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="font-semibold text-charcoal mb-3">Order summary</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={`${item.id}-${item.grainSize || ''}`} className="flex justify-between text-sm">
              <span>{item.name} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-semibold text-charcoal">
          <span>Subtotal</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-charcoal-light mt-1">Shipping and tax are calculated on the proforma invoice after submission.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="font-semibold text-charcoal">Shipping address</h2>
        <div>
          <label className={labelClass}>Full name / Company contact</label>
          <input required value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Address line 1</label>
          <input required value={form.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Address line 2 (optional)</label>
          <input value={form.addressLine2} onChange={(e) => handleChange('addressLine2', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input required value={form.city} onChange={(e) => handleChange('city', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input required value={form.state} onChange={(e) => handleChange('state', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Postal code</label>
            <input required value={form.postalCode} onChange={(e) => handleChange('postalCode', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input required value={form.country} onChange={(e) => handleChange('country', e.target.value)} className={inputClass} />
          </div>
        </div>

        <h2 className="font-semibold text-charcoal pt-2">Purchase order details</h2>
        <div>
          <label className={labelClass}>Your PO reference (optional)</label>
          <input value={form.dealerPoReference} onChange={(e) => handleChange('dealerPoReference', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes for our team (optional)</label>
          <textarea value={form.dealerNotes} onChange={(e) => handleChange('dealerNotes', e.target.value)} rows={3} className={inputClass} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-12 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Purchase Request'}
        </button>
      </form>
    </div>
  );
}
