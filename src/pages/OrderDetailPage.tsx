import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock, Loader2, Package, ShoppingCart, Truck } from 'lucide-react';
import DashboardSidebar from '../components/account/DashboardSidebar';
import { useAuthContext } from '../context/AuthContext';
import { ordersApi } from '../lib/supabase/api';
import { isSupabaseConfigured } from '../lib/supabase/client';
import type { Json, OrderWithItems } from '../lib/supabase/database.types';
import { useCart } from '../store/cartStore';

const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={16} />,
  processing: <Package size={16} />,
  shipped: <Truck size={16} />,
  delivered: <Check size={16} />,
};

interface ShippingAddress {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user, profile } = useAuthContext();
  const { addItem } = useCart();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        setOrder(await ordersApi.getOrderById(orderId, user.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user?.id]);

  const handleReorder = async () => {
    if (!order) return;

    for (const item of order.order_items) {
      await addItem({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        image: item.product_image || '',
        grainSize: item.grain_size || undefined,
      }, item.quantity);
    }
  };

  const shippingAddress = toShippingAddress(order?.shipping_address);
  const activeStep = order ? Math.max(0, statusSteps.indexOf(order.status)) : 0;

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="bg-gradient-to-r from-charcoal to-charcoal-light py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link to="/orders" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ArrowLeft size={16} />
            Back to Orders
          </Link>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl md:text-4xl font-bold text-white"
          >
            Order Details
          </motion.h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          <DashboardSidebar profile={profile} user={user} />

          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-himalayan" />
              </div>
            ) : error || !order ? (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <Package size={64} className="mx-auto mb-6 text-gray-200" />
                <h2 className="font-serif text-2xl font-bold text-charcoal mb-2">Order Not Found</h2>
                <p className="text-charcoal-light">{error || 'We could not find this order.'}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl shadow-md p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-sm text-charcoal-light">Order Number</p>
                      <h2 className="font-serif text-2xl font-bold text-charcoal">{order.order_number}</h2>
                    </div>
                    <button
                      onClick={handleReorder}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-himalayan text-white rounded-xl font-semibold hover:bg-himalayan-dark transition-colors"
                    >
                      <ShoppingCart size={18} />
                      Reorder
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {statusSteps.map((step, index) => (
                      <div
                        key={step}
                        className={`rounded-xl px-3 py-3 border text-sm capitalize ${
                          index <= activeStep
                            ? 'border-himalayan bg-himalayan/10 text-himalayan'
                            : 'border-gray-100 text-charcoal-light'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {statusIcons[step]}
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid lg:grid-cols-3 gap-6">
                  <section className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6">
                    <h3 className="font-serif text-lg font-bold text-charcoal mb-4">Items</h3>
                    <div className="space-y-4">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <img src={item.product_image || ''} alt={item.product_name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-charcoal line-clamp-2">{item.product_name}</p>
                            <p className="text-sm text-charcoal-light">
                              Qty {item.quantity} x ${item.unit_price.toFixed(2)}{item.grain_size ? ` · ${item.grain_size}` : ''}
                            </p>
                          </div>
                          <p className="font-semibold text-charcoal">${item.total_price.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <aside className="space-y-6">
                    <section className="bg-white rounded-2xl shadow-md p-6">
                      <h3 className="font-serif text-lg font-bold text-charcoal mb-4">Invoice Summary</h3>
                      <SummaryRow label="Subtotal" value={order.subtotal} />
                      <SummaryRow label="Shipping" value={order.shipping_cost} />
                      <SummaryRow label="Tax" value={order.tax_amount} />
                      <div className="flex justify-between font-bold text-lg pt-3 mt-3 border-t border-gray-100">
                        <span className="text-charcoal">Total</span>
                        <span className="text-himalayan">${order.total.toFixed(2)}</span>
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
                  </aside>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-charcoal-light">{label}</span>
      <span className="text-charcoal">${value.toFixed(2)}</span>
    </div>
  );
}

function toShippingAddress(value: Json | undefined): ShippingAddress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ShippingAddress;
}
