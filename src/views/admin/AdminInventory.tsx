import { useCallback, useEffect, useState } from 'react';
import { Boxes, PackageCheck, RefreshCw } from 'lucide-react';
import {
  readAdminCatalogPage,
  readAdminCatalogStats,
  type AdminCatalogRow,
  type AdminCatalogStats,
} from '../../lib/backend';
import { getErrorMessage } from '../../lib/errors';
import {
  ADMIN_TD,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';

/**
 * Inventory.
 *
 * WooCommerce is the inventory system of record, and its public product routes
 * report no unit counts — so this page shows the stock state the catalog adapter
 * actually received, and names the credential that would make counts and
 * low-stock thresholds readable. It never derives a number from anything else:
 * a product whose stock is unknown is listed as unknown.
 */
const INVENTORY_PAGE_SIZE = 100;

export default function AdminInventory() {
  const [rows, setRows] = useState<AdminCatalogRow[]>([]);
  const [stats, setStats] = useState<AdminCatalogStats | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, catalogStats] = await Promise.all([
        readAdminCatalogPage({ perPage: INVENTORY_PAGE_SIZE, sort: 'name' }),
        readAdminCatalogStats(),
      ]);
      setRows(page.rows);
      setWarnings(page.warnings);
      setStats(catalogStats);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to read the catalog.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reported = rows.filter((row) => row.stockStatus !== 'unknown');
  const unknown = rows.length - reported.length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Inventory"
        description="Stock state for every product in the configured catalog source."
        actions={
          <button
            type="button"
            onClick={load}
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

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Products read"
          icon={Boxes}
          tone="brand"
          value={loading ? undefined : rows.length}
          unavailable={loading ? 'Reading…' : undefined}
          hint={stats?.source === 'woocommerce' ? 'WooCommerce' : 'Supabase'}
        />
        <AdminStatTile
          label="Stock reported"
          icon={PackageCheck}
          tone="green"
          value={loading ? undefined : reported.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Stock unknown"
          icon={Boxes}
          tone="amber"
          value={loading ? undefined : unknown}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Price unavailable"
          icon={Boxes}
          tone="slate"
          value={stats?.source === 'woocommerce' ? stats.priceUnavailable : undefined}
          unavailable={stats?.source === 'supabase' ? 'Supabase tracks prices' : loading ? 'Reading…' : undefined}
        />
      </div>

      {warnings.length > 0 && (
        <AdminNotice tone="warning" title="Some catalog fields could not be read">
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </AdminNotice>
      )}

      <AdminPanel
        title="Stock by product"
        description="Only stock the source actually reported. Unknown stock is shown as unknown, never as zero or in stock."
        action={<AdminChip tone="neutral">{rows.length} products</AdminChip>}
      >
        <AdminTable
          columns={[
            { key: 'product', label: 'Product', width: '44%' },
            { key: 'sku', label: 'SKU' },
            { key: 'qty', label: 'Quantity', align: 'right' },
            { key: 'status', label: 'Status', align: 'right' },
          ]}
        >
          {loading ? (
            <AdminTableSkeleton rows={5} columns={4} />
          ) : rows.length === 0 ? (
            <tr>
              <td className={ADMIN_TD} colSpan={4}>
                <span className="text-sm text-admin-muted">
                  No products were returned by the configured catalog source.
                </span>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={ADMIN_TD}>
                  <div className="flex items-center gap-3">
                    <img
                      src={row.image || '/images/placeholder-product.svg'}
                      alt=""
                      className="h-9 w-9 rounded-lg bg-admin-canvas object-cover"
                    />
                    <span className="truncate font-medium">{row.name}</span>
                  </div>
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>{row.sku ?? 'Not reported'}</td>
                <td className={`${ADMIN_TD} text-right font-semibold`}>
                  {row.stockQuantity === null ? '—' : row.stockQuantity}
                </td>
                <td className={`${ADMIN_TD} text-right`}>
                  {row.stockStatus === 'unknown' ? (
                    <AdminChip tone="muted">Unknown</AdminChip>
                  ) : row.stockStatus === 'in_stock' ? (
                    <AdminChip tone="success">In stock</AdminChip>
                  ) : row.stockStatus === 'out_of_stock' ? (
                    <AdminChip tone="danger">Out of stock</AdminChip>
                  ) : (
                    <AdminChip tone="warning">On backorder</AdminChip>
                  )}
                </td>
              </tr>
            ))
          )}
        </AdminTable>
      </AdminPanel>

      <AdminPendingPanel
        title="Inventory management is not connected"
        summary="Counts, low-stock thresholds, backorders and stock writes all live in WooCommerce behind its authenticated REST API. Nothing on this page is derived from another system to fill the gap."
        needs={[
          'A WooCommerce REST API key with read access, set server-side as WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET (never NEXT_PUBLIC).',
          'A write key for stock adjustments, so the console can set quantity and threshold on the WooCommerce product.',
          'The WordPress-side Store API fatal fixed, so public stock status reaches the storefront as well.',
        ]}
        available={[
          `${reported.length} product${reported.length === 1 ? '' : 's'} already report a stock status through the catalog adapter.`,
          'WooCommerce remains the single inventory owner — no second inventory table exists to drift.',
        ]}
      />
    </>
  );
}
