'use client';

import { useMemo, useState } from 'react';
import { Crosshair, Globe, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  AdminCapabilityPanel,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';

type Tab = 'watch' | 'signals' | 'found';

const TABS: { id: Tab; label: string }[] = [
  { id: 'watch', label: 'Watch list' },
  { id: 'signals', label: 'Signals' },
  { id: 'found', label: 'Shortlist' },
];

/**
 * Validates a watched source the same way an importer validates a target: a real
 * absolute http(s) host. Deterministic, so it runs for real here.
 */
function sourceProblem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Enter a supplier, market or category URL to watch.';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'That is not a complete URL — include https://.';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Only http and https URLs can be watched.';
  return null;
}

/**
 * Product Scout — watching supplier and market sources for products worth adding.
 *
 * Scouting is an external reading: it needs a fetcher and a model, neither of
 * which is connected. What is real is the criterion side of it — which categories
 * this store already sells in, read from the live catalog — so a scout watch can
 * be configured against the store's actual shape instead of in the abstract.
 */
export default function AdminScout() {
  const [tab, setTab] = useState<Tab>('watch');
  const [sources, setSources] = useState<string[]>(['']);
  const { facets, warnings, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  const validation = useMemo(() => sources.map(sourceProblem), [sources]);
  const usable = sources.filter((source, index) => source.trim() && !validation[index]);

  const update = (index: number, value: string) =>
    setSources((current) => current.map((source, i) => (i === index ? value : source)));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="Product Scout"
        description="Sources worth watching for products this store could sell — priced, in stock and shippable."
        actions={
          <>
            <AdminPendingChip label="External reading not connected" />
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
            >
              <RefreshCw size={16} />
              Refresh catalog
            </button>
          </>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read the catalog">
          {error}
        </AdminNotice>
      )}

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'watch' && (
        <>
          <AdminPanel
            title="Watch list"
            description="URLs a scout pass would read. Validation runs now; fetching needs the scout connection."
          >
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <AdminField
                    label={`Source ${index + 1}`}
                    hint={source.trim() && validation[index] ? validation[index] ?? undefined : undefined}
                  >
                    <AdminInput
                      value={source}
                      onChange={(event) => update(index, event.target.value)}
                      placeholder="https://supplier.example/collections/bulk-salt"
                    />
                  </AdminField>
                  <button
                    type="button"
                    aria-label={`Remove source ${index + 1}`}
                    onClick={() => setSources((current) => current.filter((_, i) => i !== index))}
                    className="mb-1 rounded-xl border border-admin-line p-2.5 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSources((current) => [...current, ''])}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
            >
              <Plus size={15} />
              Add source
            </button>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-admin-line pt-4">
              <AdminChip tone={usable.length > 0 ? 'brand' : 'muted'}>
                {usable.length} usable source{usable.length === 1 ? '' : 's'}
              </AdminChip>
              <span className="text-xs text-admin-muted">
                A scout pass needs the external-reading connection below.
              </span>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Categories this store scouts in"
            description={`Read from ${catalogSourceLabel()} — scouting follows the store's own shelf`}
          >
            <div className="flex flex-wrap gap-2">
              {loading && <span className="text-sm text-admin-muted">Reading catalog…</span>}
              {!loading && facets.length === 0 && (
                <span className="text-sm text-admin-muted">
                  No categories were reported by the catalog source.
                </span>
              )}
              {facets.map((facet) => (
                <AdminChip key={facet.id} tone="muted">
                  {facet.name}
                </AdminChip>
              ))}
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Running a scout pass"
            summary="Reading each watched source, comparing what it offers against the catalog, and shortlisting what fits."
            capabilities={['ai-text', 'supplier-feed']}
            available={[
              `${usable.length} source${usable.length === 1 ? '' : 's'} already pass validation, so a pass has somewhere to read from.`,
              'A found product is only a shortlist entry — adding it to the catalog stays a separate, reviewed step.',
            ]}
          />
        </>
      )}

      {tab === 'signals' && (
        <AdminCapabilityPanel
          title="Signals"
          summary="What changed at a watched source — a new size, a price move, a restock — since the last pass."
          capabilities={['supplier-feed']}
          available={[
            'Nothing is asserted until a source has actually been read twice, because a signal is a change and needs two readings.',
          ]}
        />
      )}

      {tab === 'found' && (
        <AdminCapabilityPanel
          title="Shortlist"
          summary="Candidates a scout pass kept, with the margin they would carry at the store's shipping cost."
          capabilities={['supplier-feed', 'woo-write']}
          available={[
            'A shortlisted product becomes a WooCommerce draft through the same reviewed path as AI Import.',
          ]}
        />
      )}

      {warnings.map((warning) => (
        <AdminNotice key={warning} tone="info" title="Adapter note">
          {warning}
        </AdminNotice>
      ))}

      <div className="flex flex-wrap items-center gap-2 text-xs text-admin-muted">
        <Globe size={14} />
        <p>
          Scouting reads public pages only. It does not sign in to a supplier account, and it never
          copies a competitor&apos;s images or copy into a listing.
        </p>
        <Crosshair size={14} />
      </div>
    </div>
  );
}
