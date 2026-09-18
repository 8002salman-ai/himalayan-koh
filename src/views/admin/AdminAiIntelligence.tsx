'use client';

import { Brain, Package, RefreshCw, TrendingUp } from 'lucide-react';
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
  AdminTabs,
} from '../../components/admin/AdminUI';
import { useState } from 'react';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';

type Tab = 'overview' | 'catalog' | 'traffic';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog read' },
  { id: 'traffic', label: 'Traffic read' },
];

/**
 * AI Intelligence — a reading of the store assembled from its own data.
 *
 * The insight layer needs a model, but the *inputs* it will reason over are real
 * today, and showing them is how a reviewer can tell whether an insight would be
 * worth having. So this screen reports the catalog facts it can source and names
 * the two inputs that are missing (order history under WooCommerce, traffic) rather
 * than narrating an insight it did not produce.
 */
export default function AdminAiIntelligence() {
  const [tab, setTab] = useState<Tab>('overview');
  const { rows, stats, facets, warnings, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  const priced = rows.filter((row) => !row.missing.includes('price')).length;
  const stockKnown = rows.filter((row) => row.stockStatus !== 'unknown').length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="AI Intelligence"
        description="What the store's own data says — catalog health now, demand and traffic as those sources connect."
        actions={
          <>
            <AdminPendingChip label="Model key required" />
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

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Products readable"
          icon={Package}
          tone="brand"
          value={loading ? '—' : rows.length}
          hint={catalogSourceLabel()}
        />
        <AdminStatTile
          label="With a price"
          icon={TrendingUp}
          tone="green"
          value={loading ? '—' : priced}
        />
        <AdminStatTile
          label="With known stock"
          icon={TrendingUp}
          tone={stockKnown === rows.length ? 'green' : 'amber'}
          value={loading ? '—' : stockKnown}
        />
        <AdminStatTile
          label="Categories"
          icon={Package}
          tone="brand"
          value={loading ? '—' : facets.length}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <AdminPanel title="What this screen will read" description="Inputs, and whether each is available">
            <AdminTable
              columns={[
                { key: 'input', label: 'Input' },
                { key: 'source', label: 'Source' },
                { key: 'state', label: 'State', align: 'right' },
              ]}
              minWidth="820px"
            >
              <tr>
                <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Catalog</td>
                <td className={`${ADMIN_TD} text-admin-muted`}>{catalogSourceLabel()} adapter</td>
                <td className={`${ADMIN_TD} text-right`}>
                  <AdminChip tone="success">Available</AdminChip>
                </td>
              </tr>
              <tr>
                <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Categories</td>
                <td className={`${ADMIN_TD} text-admin-muted`}>{facets.length} facets in the catalog</td>
                <td className={`${ADMIN_TD} text-right`}>
                  <AdminChip tone="success">Available</AdminChip>
                </td>
              </tr>
              <tr>
                <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Order history</td>
                <td className={`${ADMIN_TD} text-admin-muted`}>WooCommerce REST</td>
                <td className={`${ADMIN_TD} text-right`}>
                  <AdminChip tone="warning">Needs the REST key</AdminChip>
                </td>
              </tr>
              <tr>
                <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Traffic</td>
                <td className={`${ADMIN_TD} text-admin-muted`}>Analytics property</td>
                <td className={`${ADMIN_TD} text-right`}>
                  <AdminChip tone="warning">Not connected</AdminChip>
                </td>
              </tr>
            </AdminTable>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Reasoning over these inputs"
            summary="Ranked observations — what is under-priced, what is about to stock out, which pages earn nothing."
            capabilities={['ai-text']}
            available={[
              'The catalog half of the picture is live, so a catalog-only insight can be produced as soon as a model key exists.',
              'Every insight will cite the figures it used, so a wrong conclusion can be checked against the table it came from.',
            ]}
          />
        </>
      )}

      {tab === 'catalog' && (
        <AdminPanel
          title="Catalog as the model would see it"
          description={`Read from ${catalogSourceLabel()} — the exact values an insight would be computed from`}
        >
          <AdminTable
            columns={[
              { key: 'product', label: 'Product' },
              { key: 'category', label: 'Category' },
              { key: 'price', label: 'Price', align: 'right' },
              { key: 'stock', label: 'Stock', align: 'right' },
            ]}
            minWidth="900px"
          >
            {rows.slice(0, 14).map((row) => (
              <tr key={row.id}>
                <td className={`${ADMIN_TD} font-medium text-admin-ink`}>{row.name}</td>
                <td className={`${ADMIN_TD} text-admin-muted`}>{row.categoryName ?? 'Uncategorised'}</td>
                <td className={`${ADMIN_TD} text-right`}>
                  {row.missing.includes('price') ? (
                    <span className="text-admin-muted">Price unavailable</span>
                  ) : (
                    row.price
                  )}
                </td>
                <td className={`${ADMIN_TD} text-right text-admin-muted`}>
                  {row.stockQuantity === null ? row.stockStatus : row.stockQuantity}
                </td>
              </tr>
            ))}
          </AdminTable>
          {!loading && rows.length === 0 && (
            <p className="px-5 py-6 text-sm text-admin-muted">
              The catalog source reported nothing, so there is no input to reason over.
            </p>
          )}
        </AdminPanel>
      )}

      {tab === 'traffic' && (
        <AdminCapabilityPanel
          title="Traffic intelligence"
          summary="Which pages earn attention and which spend it for nothing, tied back to catalog pages."
          capabilities={['traffic-analytics']}
          available={['The storefront page inventory is known, so traffic rows will map to real URLs.']}
        />
      )}

      {warnings.map((warning) => (
        <AdminNotice key={warning} tone="info" title="Adapter note">
          {warning}
        </AdminNotice>
      ))}

      <AdminNotice tone="info" title="Insights are not statements of fact">
        Anything generated here is a reading of the data shown above, with the figures attached. It
        is not permission to change a price or delist a product, and it never edits one.
      </AdminNotice>

      <div className="flex flex-wrap gap-2">
        <AdminChip tone="muted">
          <Brain size={11} /> Cited figures
        </AdminChip>
        <AdminChip tone="muted">No auto-actions</AdminChip>
      </div>
    </div>
  );
}
