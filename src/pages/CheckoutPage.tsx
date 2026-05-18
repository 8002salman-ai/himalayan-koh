import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, PackageCheck } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { calculateOrderTotals, ordersApi } from '../lib/supabase/api/orders';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { useCart } from '../store/cartStore';

const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all';

const initialForm = {
  email: '',
  phone: '',
  fullName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
  notes: '',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const { items, clearCart } = useCart();
  const [form, setForm] = useState({
    ...initialForm,
    email: user?.email || '',
    phone: profile?.phone || '',
    fullName: profile?.full_name || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => calculateOrderTotals(items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.price,
    }))),
    [items]
  );

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError('Checkout requires Supabase configuration.');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const shippingAddress = {
        fullName: form.fullName,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
      };

      const order = await ordersApi.createOrder({
        email: form.email,
        phone: form.phone || undefined,
        shippingAddress,
        billingAddress: shippingAddress,
        paymentMethod: 'invoice',
        notes: form.notes || undefined,
      }, user?.id);

      await clearCart();
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen bg-warm-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-2xl shadow-md p-12">
            <PackageCheck size={64} className="mx-auto mb-6 text-gray-200" />
            <h1 className="font-serif text-3xl font-bold text-charcoal mb-3">Your cart is empty</h1>
            <p className="text-charcoal-light mb-6">Add products to your cart before checking out.</p>
            <Link to="/products" className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link to="/products" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl md:text-4xl font-bold text-white"
          >
            Checkout
          </motion.h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input required type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} placeholder="Email address" className={inputClass} />
                <input value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} placeholder="Phone number" className={inputClass} />
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Shipping Address</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input required value={form.fullName} onChange={(event) => handleChange('fullName', event.target.value)} placeholder="Full name" className={inputClass} />
                <input required value={form.addressLine1} onChange={(event) => handleChange('addressLine1', event.target.value)} placeholder="Address line 1" className={inputClass} />
                <input value={form.addressLine2} onChange={(event) => handleChange('addressLine2', event.target.value)} placeholder="Address line 2" className={inputClass} />
                <input required value={form.city} onChange={(event) => handleChange('city', event.target.value)} placeholder="City" className={inputClass} />
                <input required value={form.state} onChange={(event) => handleChange('state', event.target.value)} placeholder="State" className={inputClass} />
                <input required value={form.postalCode} onChange={(event) => handleChange('postalCode', event.target.value)} placeholder="Postal code" className={inputClass} />
                <input required value={form.country} onChange={(event) => handleChange('country', event.target.value)} placeholder="Country" className={inputClass} />
              </div>
              <textarea value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} placeholder="Order notes (optional)" className={`${inputClass} mt-4 min-h-24 resize-none`} />
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Invoice Summary</h2>
              <div className="space-y-4 mb-5">
                {items.map((item) => (
                  <div key={`${item.id}-${item.grainSize || ''}`} className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal line-clamp-2">{item.name}</p>
                      <p className="text-xs text-charcoal-light">Qty {item.quantity}{item.grainSize ? ` · ${item.grainSize}` : ''}</p>
                    </div>
                    <span className="text-sm font-semibold text-charcoal">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <SummaryRow label="Subtotal" value={totals.subtotal} />
                <SummaryRow label="Shipping" value={totals.shippingCost} />
                <SummaryRow label="Tax" value={totals.taxAmount} />
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-100">
                  <span className="text-charcoal">Total</span>
                  <span className="text-himalayan">${totals.total.toFixed(2)}</span>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 flex items-center justify-center gap-2 py-4 bg-himalayan hover:bg-himalayan-dark disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-himalayan/25"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {submitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-charcoal-light">{label}</span>
      <span className="text-charcoal">${value.toFixed(2)}</span>
    </div>
  );
}
