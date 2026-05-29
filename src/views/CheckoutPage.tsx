import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, CreditCard, Loader2, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import StripePaymentForm from '../components/checkout/StripePaymentForm';
import {
  calculateOrderTotals,
  ordersApi,
  supportedCoupons,
  type ShippingMethod,
} from '../lib/supabase/api/orders';
import type { OrderWithItems } from '../lib/supabase/database.types';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { publicEnv } from '../lib/env';
import { useCart } from '../store/cartStore';
import {
  createStripePaymentIntent,
  isStripeConfigured,
  isStripeTestMode,
  verifyStripeOrderPayment,
} from '../lib/payments/stripe';
import {
  clearPendingStripeCheckout,
  savePendingStripeCheckout,
} from '../lib/payments/stripeSessionStorage';
import { getErrorMessage } from '../lib/errors';
import { orderConfirmationUrl } from '../lib/orders/paths';
import { fetchShippoRates } from '../lib/shippo/client';
import type { ShippoRate } from '../lib/shippo/types';
const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all';
const labelClass = 'block text-sm font-semibold text-charcoal mb-1.5';

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
  billingFullName: '',
  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCity: '',
  billingState: '',
  billingPostalCode: '',
  billingCountry: 'United States',
  notes: '',
};

type CheckoutForm = typeof initialForm;
type FieldErrors = Partial<Record<keyof CheckoutForm | 'coupon', string>>;
type PaymentMethod = 'invoice' | 'stripe';

interface StripeCheckoutSession {
  order: OrderWithItems;
  clientSecret: string;
  paymentIntentId: string;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [shippoRates, setShippoRates] = useState<ShippoRate[]>([]);
  const [selectedShippoRateId, setSelectedShippoRateId] = useState<string | null>(null);
  const [shippoRatesLoading, setShippoRatesLoading] = useState(false);
  const [shippoRatesError, setShippoRatesError] = useState<string | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    isStripeConfigured ? 'stripe' : 'invoice'
  );
  const [stripeSession, setStripeSession] = useState<StripeCheckoutSession | null>(null);
  const [paymentCompleting, setPaymentCompleting] = useState(false);
  const stripePaymentRef = useRef<HTMLDivElement>(null);

  const shippoEnabled = publicEnv.shippoEnabled;
  const selectedShippoRate = shippoRates.find((rate) => rate.objectId === selectedShippoRateId) || null;
  const useLiveShippoRates = shippoEnabled && shippoRates.length > 0 && Boolean(selectedShippoRate);

  const totals = useMemo(
    () => calculateOrderTotals(
      items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      {
        couponCode,
        shippingMethod,
        shippingCostOverride: useLiveShippoRates ? selectedShippoRate?.amount : undefined,
      }
    ),
    [couponCode, items, shippingMethod, useLiveShippoRates, selectedShippoRate?.amount]
  );

  useEffect(() => {
    if (!shippoEnabled || items.length === 0) {
      setShippoRates([]);
      setSelectedShippoRateId(null);
      return;
    }

    const addressReady =
      form.fullName.trim() &&
      form.addressLine1.trim() &&
      form.city.trim() &&
      form.state.trim() &&
      form.postalCode.trim() &&
      form.country.trim();

    if (!addressReady) {
      setShippoRates([]);
      setSelectedShippoRateId(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setShippoRatesLoading(true);
      setShippoRatesError(null);
      try {
        const result = await fetchShippoRates({
          address: buildShippingAddress(form),
          email: form.email,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        });
        setShippoRates(result.rates);
        setSelectedShippoRateId((current) => {
          if (current && result.rates.some((rate) => rate.objectId === current)) {
            return current;
          }
          return result.rates[0]?.objectId || null;
        });
      } catch (err) {
        setShippoRates([]);
        setSelectedShippoRateId(null);
        setShippoRatesError(err instanceof Error ? err.message : 'Unable to load live shipping rates.');
      } finally {
        setShippoRatesLoading(false);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    shippoEnabled,
    items,
    form.fullName,
    form.addressLine1,
    form.addressLine2,
    form.city,
    form.state,
    form.postalCode,
    form.country,
    form.email,
  ]);
  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const applyCoupon = () => {
    const nextCoupon = couponInput.trim().toUpperCase();
    if (!nextCoupon) {
      setCouponCode('');
      setFieldErrors((current) => ({ ...current, coupon: undefined }));
      return;
    }

    if (!supportedCoupons[nextCoupon]) {
      setFieldErrors((current) => ({ ...current, coupon: 'Coupon code is not valid.' }));
      setCouponCode('');
      return;
    }

    setCouponCode(nextCoupon);
    setFieldErrors((current) => ({ ...current, coupon: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {};
    const requiredFields: (keyof CheckoutForm)[] = [
      'email',
      'fullName',
      'addressLine1',
      'city',
      'state',
      'postalCode',
      'country',
    ];

    requiredFields.forEach((field) => {
      if (!form[field].trim()) nextErrors[field] = 'Required';
    });

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email.';
    }

    if (!billingSameAsShipping) {
      ([
        'billingFullName',
        'billingAddressLine1',
        'billingCity',
        'billingState',
        'billingPostalCode',
        'billingCountry',
      ] as (keyof CheckoutForm)[]).forEach((field) => {
        if (!form[field].trim()) nextErrors[field] = 'Required';
      });
    }

    if (paymentMethod === 'stripe' && !isStripeConfigured) {
      nextErrors.coupon =
        'Card payments need NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY in .env.local (test keys pk_test_ / sk_test_).';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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

    if (!validateForm()) {
      setError('Please fix the highlighted checkout fields.');
      return;
    }

    setSubmitting(true);
    try {
      const shippingAddress = buildShippingAddress(form);
      const billingAddress = billingSameAsShipping
        ? shippingAddress
        : buildBillingAddress(form);

      const orderPayload = {
        email: form.email,
        phone: form.phone || undefined,
        shippingAddress,
        billingAddress,
        couponCode,
        shippingMethod,
        shippingCostOverride: useLiveShippoRates ? selectedShippoRate?.amount : undefined,
        shippoRateId: useLiveShippoRates ? selectedShippoRate?.objectId : undefined,
        shippingCarrier: useLiveShippoRates ? selectedShippoRate?.provider : undefined,
        shippingService: useLiveShippoRates ? selectedShippoRate?.serviceName : undefined,
        notes: form.notes || undefined,
      };

      if (paymentMethod === 'invoice') {
        const order = await ordersApi.createOrder({
          ...orderPayload,
          paymentProvider: 'invoice',
          paymentMethod: 'invoice',
          paymentStatus: 'pending',
        }, user?.id);
        await clearCart();
        navigate(orderConfirmationUrl(order.id), { state: { order } });
        return;
      }

      if (stripeSession) {
        setError('Complete card payment below, or switch to invoice checkout.');
        return;
      }

      const order = await ordersApi.createOrder({
        ...orderPayload,
        paymentProvider: 'stripe',
        paymentMethod: 'stripe_card',
        paymentStatus: 'pending',
        clearCart: false,
      }, user?.id);
      const paymentIntent = await createStripePaymentIntent({
        email: form.email,
        orderId: order.id,
        couponCode,
        shippingMethod,
        items,
      });

      setStripeSession({
        order,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
      });
      savePendingStripeCheckout({
        orderId: order.id,
        paymentIntentId: paymentIntent.paymentIntentId,
      });
      setError(null);
      requestAnimationFrame(() => {
        stripePaymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to place order.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripePaymentSuccess = async () => {
    if (!stripeSession) return;

    setPaymentCompleting(true);
    setSubmitting(true);
    setError(null);
    try {
      await verifyStripeOrderPayment({
        orderId: stripeSession.order.id,
        paymentIntentId: stripeSession.paymentIntentId,
      });

      const paidOrder: OrderWithItems = {
        ...stripeSession.order,
        payment_status: 'paid',
        payment_method: 'stripe_card',
      };

      clearPendingStripeCheckout();
      navigate(orderConfirmationUrl(paidOrder.id), { state: { order: paidOrder } });
      await clearCart();
    } catch (err) {
      setPaymentCompleting(false);
      setError(getErrorMessage(err, 'Payment succeeded but order confirmation failed. Contact support with your email.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting && !stripeSession && !paymentCompleting) {
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
          <p className="text-white/70 mt-2 max-w-2xl">
            Secure order review, shipping details, and payment preparation for Himalayan Koh products.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {(!isSupabaseConfigured() || (paymentMethod === 'stripe' && !isStripeConfigured)) && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Payments not configured on this machine</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {!isSupabaseConfigured() && (
                <li>
                  Add Supabase keys to <code className="text-xs">.env.local</code> (URL + anon key + service role).
                </li>
              )}
              {paymentMethod === 'stripe' && !isStripeConfigured && (
                <li>
                  Add Stripe test keys to <code className="text-xs">.env.local</code>, restart with{' '}
                  <code className="text-xs">npm run dev:clean</code>, then run{' '}
                  <code className="text-xs">npm run check:stripe</code>.
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Email address" error={fieldErrors.email}>
                  <input required type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} placeholder="you@example.com" className={inputClass} />
                </Field>
                <Field label="Phone number">
                  <input value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} placeholder="(832) 224-6466" className={inputClass} />
                </Field>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center gap-2 mb-5">
                <Truck size={20} className="text-himalayan" />
                <h2 className="font-serif text-xl font-bold text-charcoal">Shipping Address</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Full name" error={fieldErrors.fullName}>
                  <input required value={form.fullName} onChange={(event) => handleChange('fullName', event.target.value)} placeholder="Full name" className={inputClass} />
                </Field>
                <Field label="Address line 1" error={fieldErrors.addressLine1}>
                  <input required value={form.addressLine1} onChange={(event) => handleChange('addressLine1', event.target.value)} placeholder="Street address" className={inputClass} />
                </Field>
                <Field label="Address line 2">
                  <input value={form.addressLine2} onChange={(event) => handleChange('addressLine2', event.target.value)} placeholder="Suite, building, ranch name" className={inputClass} />
                </Field>
                <Field label="City" error={fieldErrors.city}>
                  <input required value={form.city} onChange={(event) => handleChange('city', event.target.value)} placeholder="City" className={inputClass} />
                </Field>
                <Field label="State" error={fieldErrors.state}>
                  <input required value={form.state} onChange={(event) => handleChange('state', event.target.value)} placeholder="State" className={inputClass} />
                </Field>
                <Field label="Postal code" error={fieldErrors.postalCode}>
                  <input required value={form.postalCode} onChange={(event) => handleChange('postalCode', event.target.value)} placeholder="Postal code" className={inputClass} />
                </Field>
                <Field label="Country" error={fieldErrors.country}>
                  <input required value={form.country} onChange={(event) => handleChange('country', event.target.value)} placeholder="Country" className={inputClass} />
                </Field>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Shipping Method</h2>

              {shippoEnabled && (
                <div className="mb-4 rounded-xl border border-himalayan/20 bg-himalayan/5 px-4 py-3 text-sm">
                  <p className="font-semibold text-charcoal">Live carrier rates (Shippo)</p>
                  {shippoRatesLoading && (
                    <p className="text-charcoal-light mt-1 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Fetching rates for your address...
                    </p>
                  )}
                  {!shippoRatesLoading && shippoRatesError && (
                    <p className="text-amber-800 mt-1">{shippoRatesError} Using standard flat rates below.</p>
                  )}
                  {!shippoRatesLoading && shippoRates.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {shippoRates.map((rate) => (
                        <button
                          key={rate.objectId}
                          type="button"
                          onClick={() => setSelectedShippoRateId(rate.objectId)}
                          className={`w-full text-left rounded-xl border p-3 transition-colors ${
                            selectedShippoRateId === rate.objectId
                              ? 'border-himalayan bg-white'
                              : 'border-gray-200 hover:border-himalayan/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-charcoal">{rate.provider} — {rate.serviceName}</p>
                              <p className="text-xs text-charcoal-light mt-0.5">
                                {rate.estimatedDays ? `${rate.estimatedDays} business days` : 'Estimated delivery varies'}
                              </p>
                            </div>
                            <span className="font-bold text-himalayan">${rate.amount.toFixed(2)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!shippoRatesLoading && shippoRates.length === 0 && !shippoRatesError && (
                    <p className="text-charcoal-light mt-1">Complete your shipping address to see live carrier rates.</p>
                  )}
                </div>
              )}

              {!useLiveShippoRates && (
              <div className="grid md:grid-cols-2 gap-4">
                <ShippingOption
                  active={shippingMethod === 'standard'}
                  title={totals.subtotal >= 50 ? 'Standard Shipping (Free)' : 'Standard Shipping'}
                  detail={totals.subtotal >= 50 ? 'Free over $50' : '3-7 business days'}
                  price={totals.subtotal >= 50 ? '$0.00' : '$9.95'}
                  onClick={() => setShippingMethod('standard')}
                />
                <ShippingOption
                  active={shippingMethod === 'expedited'}
                  title="Expedited Shipping"
                  detail="2-4 business days"
                  price="$18.95"
                  onClick={() => setShippingMethod('expedited')}
                />
              </div>
              )}
            </section>
            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Billing Details</h2>
              <label className="flex items-center gap-2 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(event) => setBillingSameAsShipping(event.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                />
                <span className="text-sm text-charcoal">Billing address is the same as shipping</span>
              </label>

              {!billingSameAsShipping && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Billing full name" error={fieldErrors.billingFullName}>
                    <input value={form.billingFullName} onChange={(event) => handleChange('billingFullName', event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Billing address line 1" error={fieldErrors.billingAddressLine1}>
                    <input value={form.billingAddressLine1} onChange={(event) => handleChange('billingAddressLine1', event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Billing address line 2">
                    <input value={form.billingAddressLine2} onChange={(event) => handleChange('billingAddressLine2', event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Billing city" error={fieldErrors.billingCity}>
                    <input value={form.billingCity} onChange={(event) => handleChange('billingCity', event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Billing state" error={fieldErrors.billingState}>
                    <input value={form.billingState} onChange={(event) => handleChange('billingState', event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Billing postal code" error={fieldErrors.billingPostalCode}>
                    <input value={form.billingPostalCode} onChange={(event) => handleChange('billingPostalCode', event.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Billing country" error={fieldErrors.billingCountry}>
                    <input value={form.billingCountry} onChange={(event) => handleChange('billingCountry', event.target.value)} className={inputClass} />
                  </Field>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-2">Payment</h2>
              <p className="text-sm text-charcoal-light mb-5">
                {isStripeConfigured
                  ? 'Pay securely with your card at checkout. Invoice is available for wholesale or manual billing.'
                  : 'Card payments are not configured on this site. Place your order and pay by invoice.'}
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={!isStripeConfigured}
                  onClick={() => {
                    setPaymentMethod('stripe');
                    setStripeSession(null);
                  }}
                  className={`relative text-left rounded-2xl border p-4 transition-colors ${
                    paymentMethod === 'stripe'
                      ? 'border-himalayan bg-himalayan/10 ring-2 ring-himalayan/30'
                      : isStripeConfigured
                        ? 'border-gray-200 hover:border-himalayan/40'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-80'
                  }`}
                >
                  {isStripeConfigured && (
                    <span className="absolute top-3 right-3 rounded-full bg-himalayan px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Recommended
                    </span>
                  )}
                  <CreditCard size={22} className="text-himalayan mb-2" />
                  <p className="font-semibold text-charcoal">Pay with Card</p>
                  <p className="text-sm text-charcoal-light mt-1">
                    {isStripeConfigured
                      ? isStripeTestMode
                        ? 'Enter card details after clicking Continue — test card 4242 4242 4242 4242.'
                        : 'Secure card payment via Stripe. Enter card number, expiry, and CVC on the next step.'
                      : 'Add Stripe keys to enable online card payment.'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('invoice');
                    setStripeSession(null);
                  }}
                  className={`text-left rounded-2xl border p-4 transition-colors ${paymentMethod === 'invoice' ? 'border-charcoal/30 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <PackageCheck size={22} className="text-charcoal-light mb-2" />
                  <p className="font-semibold text-charcoal">Pay by Invoice</p>
                  <p className="text-sm text-charcoal-light mt-1">
                    No card required now. We will email you to arrange payment before shipping.
                  </p>
                </button>
              </div>

              {paymentMethod === 'stripe' && isStripeConfigured && !stripeSession && (
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-charcoal-light">
                  <p className="font-semibold text-charcoal mb-1">How card checkout works</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click <strong>Continue to payment</strong> to save your order.</li>
                    <li>Enter your card number, expiry date, and security code in the secure form below.</li>
                    <li>Click <strong>Pay ${totals.total.toFixed(2)}</strong> — your order is confirmed when payment succeeds.</li>
                  </ol>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Delivery Notes</h2>
              <textarea
                value={form.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                placeholder="Gate code, delivery instructions, ranch drop-off notes, or product preferences"
                className={`${inputClass} min-h-28 resize-none`}
              />
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24">
              <h2 className="font-serif text-xl font-bold text-charcoal mb-5">Order Summary</h2>
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

              <div className="border-t border-gray-100 pt-4 mb-4">
                <label className={labelClass}>Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="HKWELCOME10"
                    className={inputClass}
                  />
                  <button type="button" onClick={applyCoupon} className="px-4 bg-charcoal text-white rounded-xl text-sm font-semibold hover:bg-charcoal-light">
                    Apply
                  </button>
                </div>
                {fieldErrors.coupon && <p className="text-xs text-red-600 mt-1">{fieldErrors.coupon}</p>}
                {couponCode && (
                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    <CheckCircle size={13} />
                    {supportedCoupons[couponCode].label} applied
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <SummaryRow label="Subtotal" value={totals.subtotal} />
                {totals.discountAmount > 0 && <SummaryRow label="Discount" value={-totals.discountAmount} />}
                <SummaryRow label="Shipping" value={totals.shippingCost} />
                <SummaryRow label="Tax" value={totals.taxAmount} />
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-100">
                  <span className="text-charcoal">Total</span>
                  <span className="text-himalayan">${totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 text-xs text-charcoal-light">
                <ShieldCheck size={16} className="text-himalayan flex-shrink-0 mt-0.5" />
                <p>
                  {paymentMethod === 'stripe' && isStripeConfigured
                    ? stripeSession
                      ? 'Complete card payment below to confirm your order.'
                      : 'Step 1: Continue to payment, then enter your card details on this page.'
                    : 'Invoice order — no card needed. Payment will be arranged by email before shipping.'}
                </p>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting || (paymentMethod === 'stripe' && Boolean(stripeSession))}
                className="w-full mt-6 flex items-center justify-center gap-2 py-4 bg-himalayan hover:bg-himalayan-dark disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-himalayan/25"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {submitting
                  ? paymentMethod === 'stripe' ? 'Preparing payment...' : 'Placing Order...'
                  : paymentMethod === 'stripe'
                    ? stripeSession
                      ? 'Enter card details above'
                      : 'Continue to payment'
                    : 'Place order (invoice)'}
              </button>
            </div>
          </aside>
        </div>
      </form>

      {paymentMethod === 'stripe' && stripeSession && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div
            ref={stripePaymentRef}
            className="max-w-3xl rounded-2xl border-2 border-himalayan/40 bg-white p-6 shadow-md"
          >
            <p className="text-sm font-semibold text-charcoal mb-1">
              Step 2 — Enter card details · Order {stripeSession.order.order_number}
            </p>
            <p className="text-xs text-charcoal-light mb-4">
              Total due now: <strong className="text-charcoal">${totals.total.toFixed(2)}</strong>
            </p>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <StripePaymentForm
              clientSecret={stripeSession.clientSecret}
              amountLabel={`$${totals.total.toFixed(2)}`}
              disabled={submitting || paymentCompleting}
              onSuccess={handleStripePaymentSuccess}
              onError={(message) => setError(message)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

function ShippingOption({ active, title, detail, price, onClick }: {
  active: boolean;
  title: string;
  detail: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-colors ${active ? 'border-himalayan bg-himalayan/10' : 'border-gray-200 hover:border-himalayan/40'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-charcoal">{title}</p>
          <p className="text-sm text-charcoal-light mt-1">{detail}</p>
        </div>
        <span className="font-bold text-himalayan">{price}</span>
      </div>
    </button>
  );
}

function buildShippingAddress(form: CheckoutForm) {
  return {
    fullName: form.fullName,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2 || undefined,
    city: form.city,
    state: form.state,
    postalCode: form.postalCode,
    country: form.country,
  };
}

function buildBillingAddress(form: CheckoutForm) {
  return {
    fullName: form.billingFullName,
    addressLine1: form.billingAddressLine1,
    addressLine2: form.billingAddressLine2 || undefined,
    city: form.billingCity,
    state: form.billingState,
    postalCode: form.billingPostalCode,
    country: form.billingCountry,
  };
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-charcoal-light">{label}</span>
      <span className={value < 0 ? 'text-green-700' : 'text-charcoal'}>
        {value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
}
