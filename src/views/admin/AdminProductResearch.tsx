'use client';

import { useMemo, useState } from 'react';
import { FlaskConical, Package, RefreshCw, TrendingUp } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';

type Tab = 'shelf' | 'requests' | 'brief';

const TABS: { id: Tab; label: string }[] = [
  { id: 'shelf', label: 'Shelf review' },
  { id: 'requests', label: 'Requests' },
  { id: 'brief', label: 'How research is run' },
];

/**
 * Product Research — where the catalog is thin, judged from the catalog itself.
 *
 * The composition below is arithmetic over the live catalog: how many products
 * each category holds, how many of them can actually be priced and shipped, and
 * which are single-product categories with no depth behind them. That is real
 * today. Demand, competition and keyword volume are external readings and are
 * named as missing rather than estimated.
 */
export default function AdminProductResearch() {
  const [tab, setTab] = useState<Tab>('shelf');
  const { rows, facets, warnings, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  const shelf = useMemo(() => {
    const byCategory = new Map<string, { total: number; priced: number; stockKnown: number }>();
    for (const row of rows) {
      const key = row.categoryName ?? 'Uncategorised';
      const entry = byCategory.get(key) ?? { total: 0, priced: 0, stockKnown: 0 };
      entry.total += 1;
      if (!row.missing.includes('price')) entry.priced += 1;
      if (row.stockStatus !== 'unknown') entry.stockKnown += 1;
      byCategory.set(key, entry);
    }
    return [...byCategory.entries()]
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => a.total - b.total);
  }, [rows]);

  const thin = shelf.filter((entry) => entry.total <= 2);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="Product Research"
        description="Where the catalog is thin and what would be worth adding — computed from the store's own shelf."
        actions={
          <>
            <AdminPendingChip label="Demand data not connected" />
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read the catalog">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Categories"
          icon={Package}
          tone="brand"
          value={loading ? '—' : shelf.length}
          hint={catalogSourceLabel()}
        />
        <AdminStatTile
          label="Thin categories"
          icon={FlaskConical}
          tone={thin.length > 0 ? 'amber' : 'green'}
          value={loading ? '—' : thin.length}
          hint="2 products or fewer"
        />
        <AdminStatTile
          label="Products"
          icon={TrendingUp}
          tone="brand"
          value={loading ? '—' : rows.length}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'shelf' && (
        <>
          <AdminPanel
            title="Shelf composition"
            description={`Counted from ${catalogSourceLabel()} — a category with one product cannot carry a browse journey`}
          >
            <AdminTable
              columns={[
                { key: 'category', label: 'Category' },
                { key: 'total', label: 'Products', align: 'right' },
                { key: 'priced', label: 'Priced', align: 'right' },
                { key: 'stock', label: 'Stock known', align: 'right' },
                { key: 'depth', label: 'Depth', align: 'right' },
              ]}
              minWidth="880px"
            >
              {loading ? (
                <AdminTableSkeleton rows={6} columns={5} />
              ) : (
                shelf.map((entry) => (
                  <tr key={entry.name}>
                    <td className={`${ADMIN_TD} font-medium text-admin-ink`}>{entry.name}</td>
                    <td className={`${ADMIN_TD} text-right`}>{entry.total}</td>
                    <td className={`${ADMIN_TD} text-right text-admin-muted`}>{entry.priced}</td>
                    <td className={`${ADMIN_TD} text-right text-admin-muted`}>{entry.stockKnown}</td>
                    <td className={`${ADMIN_TD} text-right`}>
                      {entry.total <= 2 ? (
                        <AdminChip tone="warning">Thin</AdminChip>
                      ) : entry.total <= 5 ? (
                        <AdminChip tone="neutral">Narrow</AdminChip>
                      ) : (
                        <AdminChip tone="success">Deep enough</AdminChip>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </AdminTable>
            {!loading && shelf.length === 0 && (
              <p className="px-5 py-8 text-sm text-admin-muted">
                The catalog source reported no categorised products, so there is no shelf to review.
              </p>
            )}
          </AdminPanel>

          <AdminPanel
            title="Category facets reported by the source"
            description="Kept visible next to the counts above so a mismatch between the two is obvious"
          >
            <div className="flex flex-wrap gap-2">
              {facets.length === 0 && !loading && (
                <span className="text-sm text-admin-muted">No facets reported.</span>
              )}
              {facets.map((facet) => (
                <AdminChip key={facet.id} tone="muted">
                  {facet.name}
                </AdminChip>
              ))}
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Demand side of research"
            summary="Search volume, competitor pricing and landed cost per candidate product."
            capabilities={['traffic-analytics', 'supplier-feed']}
            available={[
              loading
                ? 'Still reading the catalog — the thin-category count is stated once it answers.'
                : `${thin.length} categor${thin.length === 1 ? 'y' : 'ies'} are thin enough to be worth a research request.`,
              'Every count above is derived from the live catalog, so it cannot drift from the store.',
            ]}
          />
        </>
      )}

      {tab === 'requests' && (
        <AdminCapabilityPanel
          title="Research requests"
          summary="A question asked about a candidate product, and the evidence that answers it — kept so the same ground is not covered twice."
          capabilities={['ai-text', 'supplier-feed']}
          available={[
            'A request will be able to name the category and the gap it is filling, because the shelf review above already identifies both.',
          ]}
        />
      )}

      {tab === 'brief' && (
        <AdminPanel title="What a research brief must contain" description="Stated once, applied to every request">
          <ul className="space-y-2 text-sm text-admin-ink">
            <li>The category it strengthens, and why that shelf is thin.</li>
            <li>A target landed cost, so margin is decided before the product is sourced.</li>
            <li>Weight and dimensions — a salt product ships by weight, and freight decides viability.</li>
            <li>Whether it can be packed in the store&apos;s own warehouse; dropship-only candidates are not listed.</li>
            <li>The evidence: where the figures came from, so they can be re-checked later.</li>
          </ul>
          <p className="mt-4 text-xs text-admin-muted">
            A brief that cannot cite its figures is not a brief. This is why the screen shows a shelf
            review first and a request form second.
          </p>
        </AdminPanel>
      )}

      {warnings.map((warning) => (
        <AdminNotice key={warning} tone="info" title="Adapter note">
          {warning}
        </AdminNotice>
      ))}
    </div>
  );
}
