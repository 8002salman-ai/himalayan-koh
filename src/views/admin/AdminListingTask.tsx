'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, RefreshCw, ListChecks } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { Link } from 'react-router-dom';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';
import type { AdminCatalogRow } from '../../lib/backend';

type Tab = 'queue' | 'ready' | 'rules';

const TABS: { id: Tab; label: string }[] = [
  { id: 'queue', label: 'Needs work' },
  { id: 'ready', label: 'No defect found' },
  { id: 'rules', label: 'What counts as a defect' },
];

interface Task {
  row: AdminCatalogRow;
  /** Fixable on the product itself. */
  problems: string[];
  /** Fields this source cannot report — a connection problem, not a defect. */
  unavailable: string[];
}

/**
 * The listing defects a person can actually fix on the product.
 *
 * `missing` in the adapter means "this source could not report the field at all",
 * which is a connection problem, not a bad listing — flagging it here would send
 * someone to edit a product that has nothing wrong with it, and on the current
 * Store API configuration it would flag every product for a SKU the platform
 * never returns. So a field the source cannot supply is reported separately by
 * `unavailableFieldsFor`, and only a field the source *did* report as absent is a
 * defect.
 */
function problemsFor(row: AdminCatalogRow): string[] {
  const problems: string[] = [];
  const canReportPrice = !row.missing.includes('price');
  const canReportSku = !row.missing.includes('sku');

  if (canReportPrice && !row.price.trim()) problems.push('No price set');
  if (canReportSku && !row.sku) problems.push('No SKU set');
  if (!row.image) problems.push('No image');
  if (row.isListed === false) problems.push('Listing is inactive');
  if (row.isHiddenFromStorefront === true) problems.push('Hidden from the storefront');
  return problems;
}

/** Fields this source cannot report at all, named as a connection problem. */
function unavailableFieldsFor(row: AdminCatalogRow): string[] {
  const fields: string[] = [];
  if (row.missing.includes('price')) fields.push('price');
  if (row.missing.includes('sku')) fields.push('SKU');
  if (row.stockStatus === 'unknown') fields.push('stock');
  return fields;
}

/**
 * Listing Task — the work queue for getting products sale-ready.
 *
 * Luxedge's listing task screen is a queue of listings that need attention
 * before they can sell. This is that queue built from the real catalog: each row
 * names the specific reason it is not ready, derived from the adapter's own
 * `missing` list rather than from a guessed completeness score. A product whose
 * source simply does not report SKUs is therefore not flagged for having none.
 */
export default function AdminListingTask() {
  const [tab, setTab] = useState<Tab>('queue');
  const { rows, stats, warnings, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  const tasks = useMemo<Task[]>(
    () =>
      rows
        .map((row) => ({ row, problems: problemsFor(row), unavailable: unavailableFieldsFor(row) }))
        .filter((task) => task.problems.length > 0 || task.unavailable.length > 0),
    [rows]
  );
  const ready = useMemo(() => rows.filter((row) => problemsFor(row).length === 0), [rows]);
  const withUnavailableFields = useMemo(
    () => tasks.filter((task) => task.unavailable.length > 0).length,
    [tasks]
  );
  const withDefects = useMemo(() => tasks.filter((task) => task.problems.length > 0).length, [tasks]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="Listing Task"
        description="Products that cannot sell yet, and exactly what each one is missing."
        actions={
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read the catalog">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Listings with defects"
          icon={ClipboardList}
          tone={withDefects > 0 ? 'amber' : 'green'}
          value={loading ? '—' : withDefects}
          hint={`of ${rows.length} in the catalog`}
        />
        <AdminStatTile
          label="No fixable defect"
          icon={CheckCircle2}
          tone="green"
          value={loading ? '—' : ready.length}
          hint="readiness still depends on the fields below"
        />
        <AdminStatTile
          label="Catalog source"
          icon={ListChecks}
          tone="brand"
          value={catalogSourceLabel()}
          hint={stats && stats.source === 'woocommerce' ? 'storefront catalog' : 'rollback source'}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'queue' && (
        <>
          <AdminPanel
            title="Work queue"
            description={`Derived from what ${catalogSourceLabel()} reported for each product — nothing is inferred`}
          >
            <AdminTable
              columns={[
                { key: 'product', label: 'Product' },
                { key: 'problems', label: 'Stops it selling' },
                { key: 'fix', label: 'Where the fix happens', align: 'right' },
              ]}
              minWidth="880px"
            >
              {loading ? (
                <AdminTableSkeleton rows={6} columns={3} />
              ) : (
                tasks.map((task) => (
                  <tr key={task.row.id}>
                    <td className={ADMIN_TD}>
                      <div className="flex items-center gap-3">
                        <img
                          src={task.row.image || '/images/placeholder-product.svg'}
                          alt=""
                          className="h-9 w-9 rounded-lg bg-admin-canvas object-cover"
                        />
                        <span className="font-medium text-admin-ink">{task.row.name}</span>
                      </div>
                    </td>
                    <td className={ADMIN_TD}>
                      <div className="flex flex-wrap gap-1.5">
                        {task.problems.map((problem) => (
                          <AdminChip key={problem} tone="warning">
                            {problem}
                          </AdminChip>
                        ))}
                        {task.problems.length === 0 && (
                          <AdminChip tone="success">None</AdminChip>
                        )}
                        {task.unavailable.map((field) => (
                          <AdminChip key={field} tone="muted">
                            {field}: source cannot report
                          </AdminChip>
                        ))}
                      </div>
                    </td>
                    <td className={`${ADMIN_TD} text-right text-admin-muted`}>
                      {task.problems.length > 0
                        ? task.row.record
                          ? 'Products editor'
                          : 'WooCommerce product'
                        : 'Catalog connection'}
                    </td>
                  </tr>
                ))
              )}
            </AdminTable>
            {!loading && tasks.length === 0 && (
              <p className="px-5 py-8 text-sm text-admin-muted">
                Every product in the catalog reports what it needs to sell. Nothing is queued.
              </p>
            )}
            {!loading && tasks.length > 0 && (
              <p className="px-5 py-4 text-xs text-admin-muted">
                {withDefects} product{withDefects === 1 ? '' : 's'} with a fixable defect ·{' '}
                {withUnavailableFields} product{withUnavailableFields === 1 ? '' : 's'} whose source
                cannot report a field. The second group is a connection problem, not a listing job —
                it is listed so the gap is visible, and excluded from the count above.
              </p>
            )}
          </AdminPanel>

          <AdminPanel
            title="Fixing a queue item"
            description="Fixes are WooCommerce writes, so the editor opens but cannot save yet"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/products"
                className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
              >
                Open the products editor
              </Link>
              <span className="text-xs text-admin-muted">
                Saving a fix needs the WooCommerce write key.
              </span>
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Applying fixes from the queue"
            summary="Editing the missing field on the WooCommerce product straight from this list."
            capabilities={['woo-write']}
            available={[
              'The queue itself is live: it reads the same catalog the storefront serves, so it cannot disagree with the store.',
              loading
                ? 'Still reading the catalog — no count is stated until it answers.'
                : `${withDefects} product${withDefects === 1 ? '' : 's'} currently have a fixable defect.`,
            ]}
          />
        </>
      )}

      {tab === 'ready' && (
        <AdminPanel
          title="No fixable defect found"
          description="Products whose readable fields are all set — a field the source cannot report leaves readiness unconfirmed, not confirmed"
        >
          <AdminTable
            columns={[
              { key: 'product', label: 'Product' },
              { key: 'price', label: 'Price', align: 'right' },
              { key: 'stock', label: 'Stock', align: 'right' },
            ]}
            minWidth="720px"
          >
            {loading ? (
              <AdminTableSkeleton rows={5} columns={3} />
            ) : (
              ready.map((row) => (
                <tr key={row.id}>
                  <td className={`${ADMIN_TD} font-medium text-admin-ink`}>{row.name}</td>
                  <td className={`${ADMIN_TD} text-right`}>{row.price}</td>
                  <td className={`${ADMIN_TD} text-right text-admin-muted`}>
                    {row.stockQuantity === null ? row.stockStatus : row.stockQuantity}
                  </td>
                </tr>
              ))
            )}
          </AdminTable>
          {!loading && ready.length === 0 && (
            <p className="px-5 py-8 text-sm text-admin-muted">
              Every product currently has at least one fixable defect.
            </p>
          )}
        </AdminPanel>
      )}

      {tab === 'rules' && (
        <AdminPanel title="A listing has a defect when" description="The rule the queue is built on">
          <ul className="space-y-2 text-sm text-admin-ink">
            <li>The source reports prices, and this product has none set.</li>
            <li>The source reports SKUs, and this product has none set.</li>
            <li>The product has no image.</li>
            <li>Its listing is inactive (a source that carries listing state).</li>
            <li>It is active but withheld from the storefront.</li>
          </ul>
          <p className="mt-4 text-xs text-admin-muted">
            A field the source cannot report at all is a different thing: it is named as{' '}
            <em>“source cannot report”</em> against the product and excluded from the defect count.
            On the public WooCommerce Store API the price and SKU of every product are unavailable
            for that reason, so penalising them would put the whole catalog in the queue for
            something no edit could fix. Stock is treated the same way: an unreported stock state is
            unknown, not zero.
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
