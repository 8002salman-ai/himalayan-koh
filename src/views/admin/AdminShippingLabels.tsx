import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, Package, Printer, Search } from 'lucide-react';
import { adminApi, AdminOrder } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import { useAuthContext } from '../../context/AuthContext';
import { createShippoLabel } from '../../lib/shippo/client';
import { getShippoClientConfig } from '../../lib/shippo/clientConfig';
import { publicEnv } from '../../lib/env';
import ShippingLabelPanel from '../../components/admin/ShippingLabelPanel';
import {
  AdminButton,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
} from '../../components/admin/AdminUI';
import { BUTTON, INPUT } from '../../components/admin/adminTheme';

export default function AdminShippingLabels() {
  const { session } = useAuthContext();
  const [shippoRuntimeEnabled, setShippoRuntimeEnabled] = useState<boolean | null>(null);
  const shippoEnabled = shippoRuntimeEnabled ?? publicEnv.shippoEnabled;
  const [ready, setReady] = useState<AdminOrder[]>([]);
  const [pending, setPending] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{ succeeded: number; failed: number; totalCost: number } | null>(null);

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

  useEffect(() => {
    getShippoClientConfig()
      .then((config) => setShippoRuntimeEnabled(config.enabled))
      .catch(() => setShippoRuntimeEnabled(false));
  }, []);

  const filterOrder = useCallback((order: AdminOrder) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(q) ||
      order.email.toLowerCase().includes(q) ||
      (order.tracking_number || '').toLowerCase().includes(q) ||
      (order.profile?.full_name || '').toLowerCase().includes(q)
    );
  }, [search]);

  const filteredReady = useMemo(() => ready.filter(filterOrder), [ready, filterOrder]);
  const filteredPending = useMemo(() => pending.filter(filterOrder), [pending, filterOrder]);

  /** Core single-order label purchase, shared by the per-row button and bulk run. Returns the rate paid (or null on failure) so bulk can total cost. */
  const createLabelForOrder = async (
    order: AdminOrder,
    token: string,
    options: { openLabel: boolean }
  ): Promise<{ ok: true; rateAmount: number | null } | { ok: false }> => {
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
      if (options.openLabel && result.labelUrl) {
        window.open(result.labelUrl, '_blank', 'noopener,noreferrer');
      }
      return { ok: true, rateAmount: result.rateAmount ?? null };
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [order.id]: err instanceof Error ? err.message : 'Unable to create label.',
      }));
      return { ok: false };
    }
  };

  const handleCreateLabel = async (order: AdminOrder) => {
    const token = session?.access_token;
    if (!token) {
      setErrors((current) => ({ ...current, [order.id]: 'Sign in again to create labels.' }));
      return;
    }

    setCreatingId(order.id);
    try {
      await createLabelForOrder(order, token, { openLabel: true });
      await fetchLabels();
    } finally {
      setCreatingId(null);
    }
  };

  /**
   * Creates one real, separately-charged Shippo label per order, one order at
   * a time — matches the per-box behavior in create-label/route.ts (no
   * batching at the carrier level, each purchase is its own charge). Runs
   * sequentially rather than in parallel so a rate-limit or carrier error on
   * one order can't spam retries across the whole batch at once, and so the
   * per-row progress state stays meaningful.
   */
  const handleCreateAllLabels = async (orders: AdminOrder[]) => {
    const token = session?.access_token;
    if (!token || orders.length === 0) return;

    const confirmed = window.confirm(
      `This will purchase ${orders.length} live shipping label${orders.length === 1 ? '' : 's'} — one real Shippo charge per order. Continue?`
    );
    if (!confirmed) return;

    setBulkRunning(true);
    setBulkSummary(null);
    let succeeded = 0;
    let failed = 0;
    let totalCost = 0;

    for (let i = 0; i < orders.length; i += 1) {
      const order = orders[i];
      setBulkProgress({ done: i, total: orders.length });
      setCreatingId(order.id);
      const result = await createLabelForOrder(order, token, { openLabel: false });
      if (result.ok) {
        succeeded += 1;
        totalCost += result.rateAmount ?? 0;
      } else {
        failed += 1;
      }
    }

    setCreatingId(null);
    setBulkProgress({ done: orders.length, total: orders.length });
    setBulkSummary({ succeeded, failed, totalCost });
    setBulkRunning(false);
    await fetchLabels();
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Shipping labels"
        description="Download and print Shippo labels, and create new ones for paid orders that are ready to ship."
        actions={
          <Link to="/admin/orders" className={BUTTON.secondary}>
            <Package size={16} />
            All orders
          </Link>
        }
      />

      {fetchError && (
        <AdminNotice
          tone="danger"
          title="Shipping labels could not be loaded"
          action={<AdminButton onClick={fetchLabels}>Retry</AdminButton>}
        >
          {fetchError}
        </AdminNotice>
      )}

      {!isSupabaseConfigured() && (
        <AdminNotice tone="warning" title="Orders are not connected">
          Labels are created against orders, and this deployment has no order source configured, so there
          is nothing here to label.
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Ready to download"
          icon={Download}
          tone="sky"
          value={loading ? undefined : ready.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Need a label"
          icon={Package}
          tone="amber"
          value={loading ? undefined : pending.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Shippo integration"
          icon={Printer}
          tone={shippoEnabled ? 'green' : 'slate'}
          value={shippoEnabled ? 'Enabled' : 'Disabled'}
        />
      </div>

      <AdminPanel bodyClassName="px-5 py-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order number, email or tracking…"
            aria-label="Search labels"
            className={`${INPUT} w-full pl-10`}
          />
        </div>
      </AdminPanel>

      {loading ? (
        <AdminPanel title="Labels" description="Reading orders…">
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-admin-canvas" />
            ))}
          </div>
        </AdminPanel>
      ) : (
        <>
          <AdminPanel
            title="Download labels"
            description="PDF labels you can print at any time"
            action={<AdminChip tone="info">{filteredReady.length}</AdminChip>}
            bodyClassName="px-0 py-0"
          >
            {filteredReady.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-admin-muted">
                No labels yet. Create one from a paid order below and it appears here for download.
              </p>
            ) : (
              <div className="divide-y divide-admin-line">
                {filteredReady.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-admin-ink">{order.order_number}</p>
                      <p className="truncate text-sm text-admin-muted">
                        {order.profile?.full_name || order.email} · {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-xs text-admin-muted">
                        {order.shipping_carrier || 'Carrier'} · {order.tracking_number || 'No tracking'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a href={order.label_url!} target="_blank" rel="noopener noreferrer" className={BUTTON.primary}>
                        <Download size={16} />
                        Download PDF
                      </a>
                      <a href={order.label_url!} target="_blank" rel="noopener noreferrer" className={BUTTON.secondary}>
                        <Printer size={16} />
                        Print
                      </a>
                      <Link to={`/admin/orders?orderId=${order.id}`} className={BUTTON.secondary}>
                        View order
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Create labels"
            description="Paid orders waiting for a shipping label. Each label is a separate, real carrier charge."
            action={
              <div className="flex items-center gap-3">
                <AdminChip tone="warning">{filteredPending.length}</AdminChip>
                {filteredPending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCreateAllLabels(filteredPending)}
                    disabled={bulkRunning || !shippoEnabled}
                    className={`${BUTTON.primary} disabled:cursor-not-allowed`}
                  >
                    {bulkRunning && <Loader2 size={16} className="animate-spin" />}
                    {bulkRunning
                      ? `Creating ${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? filteredPending.length}…`
                      : `Create all (${filteredPending.length})`}
                  </button>
                )}
              </div>
            }
            bodyClassName="px-0 py-0"
          >

            {bulkSummary && (
              <div
                className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-sm ${
                  bulkSummary.failed > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                <p className="font-semibold">
                  {bulkSummary.succeeded} label{bulkSummary.succeeded === 1 ? '' : 's'} created
                  {bulkSummary.failed > 0 && `, ${bulkSummary.failed} failed`} — total cost $
                  {bulkSummary.totalCost.toFixed(2)}
                </p>
                {bulkSummary.failed > 0 && (
                  <p className="mt-1 text-amber-800">
                    Check the error under each failed order below and retry it individually.
                  </p>
                )}
              </div>
            )}

            {filteredPending.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-admin-muted">
                All paid orders have labels, or nothing is ready to ship yet.
              </p>
            ) : (
              <div className="divide-y divide-admin-line">
                {filteredPending.map((order) => (
                  <div key={order.id} className="px-5 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-admin-ink">{order.order_number}</p>
                        <p className="text-sm text-admin-muted">
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
                      onCreateLabel={bulkRunning ? undefined : () => handleCreateLabel(order)}
                      variant="page"
                    />
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </>
      )}
    </>
  );
}
