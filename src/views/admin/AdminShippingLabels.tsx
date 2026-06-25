import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, Package, Printer, Search, Truck } from 'lucide-react';
import { adminApi, AdminOrder } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import { useAuthContext } from '../../context/AuthContext';
import { createShippoLabel } from '../../lib/shippo/client';
import { publicEnv } from '../../lib/env';
import ShippingLabelPanel from '../../components/admin/ShippingLabelPanel';

export default function AdminShippingLabels() {
  const { session } = useAuthContext();
  const shippoEnabled = publicEnv.shippoEnabled;
  const [ready, setReady] = useState<AdminOrder[]>([]);
  const [pending, setPending] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setReady([]);
      setPending([]);
      setLoading(false);
      return;
    }

    try {
      const result = await adminApi.getShippingLabelOrders();
      setReady(result.ready);
      setPending(result.pending);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load shipping label orders.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const filterOrder = (order: AdminOrder) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(q) ||
      order.email.toLowerCase().includes(q) ||
      (order.tracking_number || '').toLowerCase().includes(q) ||
      (order.profile?.full_name || '').toLowerCase().includes(q)
    );
  };

  const filteredReady = useMemo(() => ready.filter(filterOrder), [ready, search]);
  const filteredPending = useMemo(() => pending.filter(filterOrder), [pending, search]);

  const handleCreateLabel = async (order: AdminOrder) => {
    const token = session?.access_token;
    if (!token) {
      setErrors((current) => ({ ...current, [order.id]: 'Sign in again to create labels.' }));
      return;
    }

    setCreatingId(order.id);
    setErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
    setNotices((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });

    try {
      const result = await createShippoLabel(order.id, token);
      await fetchLabels();
      if (result.usedFallbackCarrier && result.carrier) {
        setNotices((current) => ({
          ...current,
          [order.id]: `Label created with ${result.carrier}. Customer tracking email sent.`,
        }));
      } else if (result.trackingNumber) {
        setNotices((current) => ({
          ...current,
          [order.id]: `Label ready. Tracking ${result.trackingNumber}.`,
        }));
      }
      if (result.labelUrl) {
        window.open(result.labelUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [order.id]: err instanceof Error ? err.message : 'Unable to create label.',
      }));
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal">Shipping Labels</h2>
          <p className="text-sm text-charcoal-light mt-1">
            Download and print Shippo labels. Create new labels for paid orders ready to ship.
          </p>
        </div>
        <Link
          to="/admin/orders"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-gray-50"
        >
          <Package size={16} />
          All orders
        </Link>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Shipping labels could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <button
            type="button"
            onClick={fetchLabels}
            className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Ready to download" value={ready.length} tone="indigo" />
        <StatCard label="Need label" value={pending.length} tone="amber" />
        <StatCard label="Shippo" value={shippoEnabled ? 'On' : 'Off'} tone={shippoEnabled ? 'green' : 'gray'} />
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-light" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order number, email, tracking..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm focus:border-himalayan focus:outline-none focus:ring-2 focus:ring-himalayan/20"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-charcoal-light">
          <Loader2 size={32} className="animate-spin mr-2" />
          Loading labels...
        </div>
      ) : (
        <>
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-charcoal">Download labels</h3>
                <p className="text-xs text-charcoal-light mt-0.5">PDF labels you can print anytime</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {filteredReady.length}
              </span>
            </div>

            {filteredReady.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-charcoal-light">
                No labels yet. Create a label from a paid order below — it will show up here for download.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredReady.map((order) => (
                  <div key={order.id} className="px-5 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-charcoal">{order.order_number}</p>
                      <p className="text-sm text-charcoal-light truncate">
                        {order.profile?.full_name || order.email} · {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-charcoal-light mt-1">
                        {order.shipping_carrier || 'Carrier'} · {order.tracking_number || 'No tracking'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <a
                        href={order.label_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                      >
                        <Download size={16} />
                        Download PDF
                      </a>
                      <a
                        href={order.label_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Printer size={16} />
                        Print
                      </a>
                      <Link
                        to={`/admin/orders?orderId=${order.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-gray-50"
                      >
                        View order
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-charcoal">Create labels</h3>
                <p className="text-xs text-charcoal-light mt-0.5">Paid orders waiting for a shipping label</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {filteredPending.length}
              </span>
            </div>

            {filteredPending.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-charcoal-light">
                All paid orders have labels, or nothing is ready to ship yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredPending.map((order) => (
                  <div key={order.id} className="px-5 py-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-charcoal">{order.order_number}</p>
                        <p className="text-sm text-charcoal-light">
                          {order.profile?.full_name || order.email} · ${order.total.toFixed(2)}
                        </p>
                      </div>
                      <Link
                        to={`/admin/orders?orderId=${order.id}`}
                        className="text-sm font-semibold text-himalayan hover:underline"
                      >
                        Open in Orders
                      </Link>
                    </div>
                    <ShippingLabelPanel
                      order={order}
                      shippoEnabled={shippoEnabled}
                      labelCreating={creatingId === order.id}
                      labelError={errors[order.id] || null}
                      labelNotice={notices[order.id] || null}
                      onCreateLabel={() => handleCreateLabel(order)}
                      variant="page"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'indigo' | 'amber' | 'green' | 'gray';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-800',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className={`rounded-2xl px-4 py-4 ${colors[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
