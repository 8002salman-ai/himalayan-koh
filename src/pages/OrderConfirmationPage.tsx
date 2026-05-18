import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package } from 'lucide-react';
import type { Json, OrderWithItems } from '../lib/supabase/database.types';

interface LocationState {
  order?: OrderWithItems;
}

interface ShippingAddress {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const order = (state as LocationState | null)?.order;
  const shippingAddress = toShippingAddress(order?.shipping_address);

  if (!order) {
    return (
      <div className="min-h-screen bg-warm-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-2xl shadow-md p-12">
            <Package size={64} className="mx-auto mb-6 text-gray-200" />
            <h1 className="font-serif text-3xl font-bold text-charcoal mb-3">Order confirmation unavailable</h1>
            <p className="text-charcoal-light mb-6">We could not find an order in this checkout session.</p>
            <Link to="/products" className="inline-flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CheckCircle size={64} className="mx-auto mb-4 text-himalayan" />
          </motion.div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white">Order Confirmed</h1>
          <p className="text-white/70 mt-2">Thank you. Your order has been received.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-gray-100">
              <div>
                <p className="text-sm text-charcoal-light">Order Number</p>
                <h2 className="font-serif text-2xl font-bold text-charcoal">{order.order_number}</h2>
              </div>
              <span className="self-start md:self-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium capitalize">
                {order.status}
              </span>
            </div>

            <div className="py-5 border-b border-gray-100">
              <h3 className="font-semibold text-charcoal mb-3">Order Flow</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {['Pending', 'Processing', 'Shipped', 'Delivered'].map((step, index) => (
                  <div key={step} className={`rounded-xl px-3 py-3 border ${index === 0 ? 'border-himalayan bg-himalayan/10 text-himalayan' : 'border-gray-100 text-charcoal-light'}`}>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5">
              <h3 className="font-semibold text-charcoal mb-4">Items</h3>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img src={item.product_image || ''} alt={item.product_name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal line-clamp-2">{item.product_name}</p>
                      <p className="text-sm text-charcoal-light">
                        Qty {item.quantity} × ${item.unit_price.toFixed(2)}{item.grain_size ? ` · ${item.grain_size}` : ''}
                      </p>
                    </div>
                    <p className="font-semibold text-charcoal">${item.total_price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-serif text-lg font-bold text-charcoal mb-4">Invoice Summary</h3>
              <div className="space-y-2">
                <SummaryRow label="Subtotal" value={order.subtotal} />
                <SummaryRow label="Shipping" value={order.shipping_cost} />
                <SummaryRow label="Tax" value={order.tax_amount} />
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-100">
                  <span className="text-charcoal">Total</span>
                  <span className="text-himalayan">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-serif text-lg font-bold text-charcoal mb-4">Shipping Address</h3>
              <div className="text-sm text-charcoal-light leading-6">
                <p className="font-medium text-charcoal">{shippingAddress.fullName}</p>
                <p>{shippingAddress.addressLine1}</p>
                {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                <p>{[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(', ')}</p>
                <p>{shippingAddress.country}</p>
              </div>
            </section>

            <Link to="/products" className="w-full flex items-center justify-center px-6 py-3 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors">
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
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

function toShippingAddress(value: Json | undefined): ShippingAddress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ShippingAddress;
}
