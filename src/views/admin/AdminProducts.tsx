import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  Archive,
  DollarSign,
  Tag,
} from 'lucide-react';
import { adminApi } from '../../lib/supabase/api/admin';
import { isRealCatalogProduct } from '../../lib/supabase/api/products';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import {
  ADMIN_CATALOG_PER_PAGE,
  isSupabaseDataSource,
  readAdminCatalogPage,
  readAdminCatalogStats,
  type AdminCatalogFacet,
  type AdminCatalogRow,
  type AdminCatalogSort,
  type AdminCatalogStats,
  type AdminEditableRecord,
} from '../../lib/backend';
import { getErrorMessage } from '../../lib/errors';
import { useToast } from '../../context/ToastContext';
import type { Category, Product as SupabaseProduct } from '../../lib/supabase/database.types';
import { PRICE_UNAVAILABLE_LABEL } from '../../lib/products/price';
import {
  formatShippingWeightLabel,
  productMissingShippingWeight,
} from '../../lib/products/shippingWeight';
import ProductEditorModal from '../../components/admin/ProductEditorModal';
import {
  ADMIN_TD,
  AdminChip,
  AdminDisabledAction,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  type AdminColumn,
} from '../../components/admin/AdminUI';
import {
  BUTTON,
  ICON_TILE,
  ICON_TILE_TONES,
  INPUT,
  MICRO_LABEL,
  SELECT,
} from '../../components/admin/adminTheme';

/**
 * Which catalog this panel is reading.
 *
 * Used only for the controls that cannot exist on every source: the listing
 * state and inventory-count filters, the packing/weight rules (Supabase-column
 * policies) and the Supabase-backed editor. The rows and stats carry their own
 * source, so anything data-shaped is answered by the read model instead.
 */
const READS_SUPABASE_CATALOG = isSupabaseDataSource();

/** What a WooCommerce row's write path is waiting for. */
const WRITE_CONNECTION_REQUIRED = 'WooCommerce write connection required';

const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';

const COLUMNS: AdminColumn[] = [
  { key: 'product', label: 'Product', width: '34%' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right', width: '140px' },
];

function rowImages(row: AdminCatalogRow): string[] {
  if (row.images.length > 0) return row.images;
  return row.image ? [row.image] : [];
}

/** Stock state for the status the source reported, or an explicit unknown. */
function stockState(row: AdminCatalogRow): { label: string; tone: 'success' | 'warning' | 'danger' | 'muted' } {
  // A source with inventory tracking switched off is not reporting a stock
  // level, so it is labelled as untracked rather than as in stock.
  if (row.trackInventory === false) return { label: 'Not tracked', tone: 'muted' };
  if (row.stockStatus === 'unknown') return { label: 'Stock unknown', tone: 'muted' };
  if (
    row.stockQuantity !== null &&
    row.trackInventory &&
    row.stockQuantity > 0 &&
    row.stockQuantity <= (row.lowStockThreshold ?? 0)
  ) {
    return { label: 'Low stock', tone: 'warning' };
  }
  const byStatus = {
    in_stock: { label: 'In stock', tone: 'success' },
    out_of_stock: { label: 'Out of stock', tone: 'danger' },
    on_backorder: { label: 'On backorder', tone: 'warning' },
    unknown: { label: 'Stock unknown', tone: 'muted' },
  } as const;
  return byStatus[row.stockStatus];
}

export default function AdminProducts() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<AdminCatalogRow[]>([]);
  const [facets, setFacets] = useState<AdminCatalogFacet[]>([]);
  const [editorCategories, setEditorCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || searchParams.get('filter') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [sortBy, setSortBy] = useState<AdminCatalogSort>('newest');
  const [productStats, setProductStats] = useState<AdminCatalogStats | null>(null);

  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminEditableRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<string | null>(null);

  /**
   * The admin catalog comes from the same read model as the storefront, so the
   * two can no longer disagree about which products exist.
   */
  const fetchCatalog = useCallback(async () => {
    setLoading(true);

    try {
      const [catalogPage, stats] = await Promise.all([
        readAdminCatalogPage({
          search: search || undefined,
          categoryId: categoryFilter || undefined,
          listing: statusFilter === 'active' ? 'active' : statusFilter === 'inactive' ? 'inactive' : undefined,
          isFeatured: statusFilter === 'featured' ? true : undefined,
          lowStock: statusFilter === 'low_stock' ? true : undefined,
          sort: sortBy,
          page,
          perPage: ADMIN_CATALOG_PER_PAGE,
        }),
        readAdminCatalogStats(),
      ]);
      setProductStats(stats);
      setWarnings(catalogPage.warnings);
      setFacets(catalogPage.facets);

      // Guard against a stale/out-of-range page: if this page came back empty but
      // products exist (e.g. items were deleted, or ?page=N is left in the URL from
      // a larger catalog), snap back to the last valid page instead of showing an
      // empty list with a hidden pager.
      if (catalogPage.rows.length === 0 && catalogPage.count > 0 && page > catalogPage.totalPages) {
        setPage(catalogPage.totalPages);
        return;
      }

      setRows(catalogPage.rows);
      setTotalCount(catalogPage.count);
      setTotalPages(catalogPage.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to load products. Please refresh and try again.'));
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, page, sortBy, toast]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // The editor saves through Supabase, so it needs Supabase categories. The
  // catalog list takes its category facets from the read model instead.
  useEffect(() => {
    if (!READS_SUPABASE_CATALOG || !isSupabaseConfigured()) return;
    adminApi
      .getCategories()
      .then(setEditorCategories)
      .catch(() => setEditorCategories([]));
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setEditingProduct(null);
      setEditorOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next);
    }
  }, [searchParams, setSearchParams]);

  // Realtime invalidation is a Supabase feature. On the WordPress/WooCommerce
  // source there is no subscription to make, exactly as on the storefront.
  useEffect(() => {
    if (!READS_SUPABASE_CATALOG || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchCatalog())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchCatalog]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params);
  }, [search, categoryFilter, statusFilter, page, setSearchParams]);

  /**
   * One way in for both sources.
   *
   * A Supabase row opens the editor that writes back to Supabase. A WooCommerce
   * row has no write path yet (its product routes need credentials this app does
   * not hold), so it opens the real product page instead — the same honest
   * detail view the storefront renders, with unknown commercial fields labelled
   * as unknown rather than filled in.
   */
  const handleOpenRow = (row: AdminCatalogRow) => {
    setContextMenu(null);
    if (!row.record) {
      if (row.slug) window.open(`/products/${row.slug}`, '_blank', 'noopener');
      return;
    }
    setEditingProduct(row.record);
    setEditorOpen(true);
  };

  /**
   * Creating and editing now use the same editor.
   *
   * Add Product used to leave for a separate shipping-ready page which made
   * every measurement mandatory and, being a plain form, offered no image
   * upload, no SEO fields, no variants and no inventory controls. So the
   * restrictive route was the only way to create a product and the capable one
   * was reachable only by editing something that already existed.
   */
  const handleCreate = () => {
    setEditingProduct(null);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      const { archived } = await adminApi.deleteProduct(id);
      setRows(prev => archived
        ? prev.map((row) => row.id === id ? { ...row, isListed: false, isFeatured: false } : row)
        : prev.filter((row) => row.id !== id));
      setDeleteConfirm(null);
      if (archived) {
        toast.info('This product has order history, so it was archived instead of deleted.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete product. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (row: AdminCatalogRow) => {
    if (!row.record) return;
    const next = !row.isListed;
    try {
      await adminApi.updateProduct(row.id, { is_active: next });
      setRows(prev => prev.map((entry) => entry.id === row.id ? { ...entry, isListed: next } : entry));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update product status.'));
    }
    setContextMenu(null);
  };

  const handleToggleFeatured = async (row: AdminCatalogRow) => {
    if (!row.record) return;
    const next = !row.isFeatured;
    try {
      await adminApi.updateProduct(row.id, { is_featured: next });
      setRows(prev => prev.map((entry) => entry.id === row.id ? { ...entry, isFeatured: next } : entry));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update featured status.'));
    }
    setContextMenu(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setActionLoading(true);
    try {
      const { archivedIds } = await adminApi.bulkDeleteProducts(selectedIds);
      const archivedIdSet = new Set(archivedIds);
      setRows(prev => prev.flatMap((row) => {
        if (!selectedIds.includes(row.id)) return [row];
        if (archivedIdSet.has(row.id)) {
          return [{ ...row, isListed: false, isFeatured: false }];
        }
        return [];
      }));
      setSelectedIds([]);
      if (archivedIds.length > 0) {
        toast.info(`${archivedIds.length} selected product${archivedIds.length === 1 ? '' : 's'} had order history and were archived instead of deleted.`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete selected products.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProduct = (savedProduct?: SupabaseProduct) => {
    fetchCatalog();
    setEditorOpen(false);
    setEditingProduct(null);

    if (savedProduct?.is_active && !isRealCatalogProduct(savedProduct)) {
      toast.error('Saved, but this product is Active and still won\'t show on your public site until its Shippo Required box dimensions are completed.');
    }
  };

  // Packing and weight are Supabase-column policies, so only the rows from that
  // source can answer them. A source that does not report weight leaves these at
  // zero rather than claiming every product is missing one.
  const supabaseRows = rows.filter((row) => row.source === 'supabase');
  const missingWeightCount = supabaseRows.filter((row) => productMissingShippingWeight(row.weight)).length;
  const hiddenFromStorefrontCount = supabaseRows.filter((row) => row.isHiddenFromStorefront === true).length;

  /**
   * Only the facts the active source reports. The tiles change with the source
   * rather than showing another catalog's numbers under our labels.
   */
  const statCards = productStats === null
    ? []
    : productStats.source === 'supabase'
      ? [
          { label: 'Total', value: productStats.total, icon: Package, tone: 'brand' as const },
          { label: 'Active', value: productStats.active, icon: Eye, tone: 'green' as const },
          { label: 'Inactive', value: productStats.inactive, icon: EyeOff, tone: 'slate' as const },
          { label: 'Featured', value: productStats.featured, icon: Star, tone: 'amber' as const },
          { label: 'Low stock', value: productStats.lowStock, icon: AlertTriangle, tone: 'amber' as const },
          { label: 'Out of stock', value: productStats.outOfStock, icon: Archive, tone: 'violet' as const },
        ]
      : [
          { label: 'Total', value: productStats.total, icon: Package, tone: 'brand' as const },
          { label: 'Featured', value: productStats.featured, icon: Star, tone: 'amber' as const },
          { label: 'Price unavailable', value: productStats.priceUnavailable, icon: DollarSign, tone: 'amber' as const },
          { label: 'SKU unavailable', value: productStats.skuUnavailable, icon: Tag, tone: 'slate' as const },
          { label: 'Stock unknown', value: productStats.stockUnknown, icon: AlertTriangle, tone: 'violet' as const },
          { label: 'Categories', value: productStats.categories, icon: Package, tone: 'sky' as const },
        ];

  const filtersActive = Boolean(search || categoryFilter || statusFilter);

  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Products"
        description={
          READS_SUPABASE_CATALOG
            ? 'Create, edit and publish the products the storefront serves.'
            : 'The WooCommerce catalog the storefront serves. Product writes arrive with the WooCommerce connection.'
        }
        actions={
          READS_SUPABASE_CATALOG ? (
            <button type="button" onClick={handleCreate} className={BUTTON.primary}>
              <Plus size={16} />
              Add product
            </button>
          ) : (
            <AdminDisabledAction label="Add product" reason={WRITE_CONNECTION_REQUIRED} />
          )
        }
      />

      {!READS_SUPABASE_CATALOG && (
        <AdminNotice tone="info" title="Read-only: this list is your WooCommerce catalog">
          Products come from WordPress/WooCommerce staging — the same source the storefront reads — so the
          console and the site can no longer show different catalogs. Creating, editing and deleting stay
          disabled until WooCommerce write access is configured; nothing falls back to Supabase.{' '}
          <strong>View</strong> opens the live product page.
        </AdminNotice>
      )}

      {warnings.length > 0 && (
        <AdminNotice tone="warning" title="Some catalog fields could not be read">
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </AdminNotice>
      )}

      {hiddenFromStorefrontCount > 0 && (
        <AdminNotice tone="danger" title={`${hiddenFromStorefrontCount} active listing${hiddenFromStorefrontCount > 1 ? 's are' : ' is'} not visible on your public site`}>
          These products are marked Active but will not appear on /products or in search until their package
          dimensions are completed. Open each one, go to the <strong>Shippo Required</strong> tab, fill in the
          box dimensions and weight, and save.
        </AdminNotice>
      )}

      {missingWeightCount > 0 && (
        <AdminNotice tone="warning" title={`Add shipping weight to ${missingWeightCount} listing${missingWeightCount > 1 ? 's' : ''}`}>
          Products without weight still stay active and use catalog box rules, but each listing should have
          weight (lbs) for accurate Shippo rates. Edit the product and complete the{' '}
          <strong>Shippo Required</strong> details.
        </AdminNotice>
      )}

      {statCards.length > 0 && (
        <div className="grid grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <AdminStatTile key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
          ))}
        </div>
      )}

      {/* Toolbar + table share one panel so the filters read as part of the list. */}
      <AdminPanel bodyClassName="px-0 py-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-admin-line px-5 py-4">
          <div className="relative min-w-[280px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input
              type="text"
              placeholder="Search products…"
              aria-label="Search products"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              className={`${INPUT} w-full pl-10`}
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}
            className={SELECT}
          >
            <option value="">All categories</option>
            {facets.map((facet) => (
              <option key={facet.id} value={facet.id}>{facet.name}</option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            className={SELECT}
          >
            <option value="">All statuses</option>
            {READS_SUPABASE_CATALOG ? (
              <>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="featured">Featured</option>
                <option value="low_stock">Low stock</option>
              </>
            ) : (
              <option value="featured">Featured</option>
            )}
          </select>

          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(event) => { setSortBy(event.target.value as AdminCatalogSort); setPage(1); }}
            className={SELECT}
          >
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>

          {filtersActive && (
            <button
              type="button"
              onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1); }}
              className={BUTTON.secondary}
            >
              Reset
            </button>
          )}

          <span className={`ml-auto ${MICRO_LABEL}`}>
            {loading ? 'Reading…' : `${totalCount} product${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>

        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 border-b border-admin-line bg-himalayan-lighter px-5 py-3"
          >
            <span className="text-sm font-semibold text-admin-ink">{selectedIds.length} selected</span>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-55"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-sm font-medium text-admin-muted hover:text-admin-ink"
            >
              Clear selection
            </button>
          </motion.div>
        )}

        <AdminTable columns={COLUMNS}>
          {loading ? (
            <AdminTableSkeleton rows={6} columns={6} />
          ) : rows.length === 0 ? (
            <tr>
              <td className={ADMIN_TD} colSpan={COLUMNS.length}>
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
                    <Package size={20} />
                  </span>
                  <p className="text-sm font-semibold text-admin-ink">No products found</p>
                  <p className="text-sm text-admin-muted">
                    {filtersActive ? 'Try adjusting your filters.' : 'This catalog source returned no products.'}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const images = rowImages(row);
              const productName = row.name || 'Untitled product';
              const stock = stockState(row);

              return (
                <tr
                  key={row.id}
                  onClick={() => handleOpenRow(row)}
                  className="cursor-pointer transition-colors hover:bg-admin-canvas/60"
                >
                  <td className={ADMIN_TD}>
                    <div className="flex items-center gap-3">
                      {row.record && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedIds([...selectedIds, row.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== row.id));
                            }
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded border-admin-line-strong text-himalayan focus:ring-himalayan"
                        />
                      )}
                      <img
                        src={row.image || images[0] || PLACEHOLDER_IMAGE}
                        alt={productName}
                        className="h-11 w-11 rounded-lg bg-admin-canvas object-cover"
                        onError={(event) => { (event.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-admin-ink">
                          <span className="max-w-[280px] truncate">{productName}</span>
                          {row.isFeatured && <Star size={13} className="shrink-0 fill-amber-500 text-amber-500" />}
                        </p>
                        <p className="mt-0.5 text-[11px] text-admin-muted">
                          {/* A null SKU means the source reported none, so it is shown as unreported. */}
                          SKU: {row.sku ?? 'Not reported'}
                          {row.weight !== null && (
                            <> · Ship: {formatShippingWeightLabel(row.weight, row.weightUnit)}</>
                          )}
                        </p>
                        {row.isHiddenFromStorefront === true ? (
                          <span className="mt-1 inline-flex">
                            <AdminChip tone="danger" icon={AlertTriangle}>Not visible on storefront</AdminChip>
                          </span>
                        ) : row.source === 'supabase' && productMissingShippingWeight(row.weight) ? (
                          <span className="mt-1 inline-flex">
                            <AdminChip tone="warning" icon={AlertTriangle}>Add shipping weight</AdminChip>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{row.categoryName || '—'}</td>
                  <td className={ADMIN_TD}>
                    {row.price ? (
                      <div>
                        <p className="font-semibold text-admin-ink">{row.price}</p>
                        {row.compareAtPrice !== null && (
                          <p className="text-xs text-admin-muted line-through">
                            ${row.compareAtPrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-admin-muted">{PRICE_UNAVAILABLE_LABEL}</span>
                    )}
                  </td>
                  <td className={ADMIN_TD}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-admin-ink">
                        {/* A source that reports no count says so instead of showing 0. */}
                        {row.stockQuantity === null ? 'Unknown' : row.stockQuantity}
                      </span>
                      <AdminChip tone={stock.tone}>{stock.label}</AdminChip>
                    </div>
                  </td>
                  <td className={ADMIN_TD}>
                    {row.isListed === null ? (
                      <span className="text-admin-muted">—</span>
                    ) : (
                      <AdminChip tone={row.isListed ? 'success' : 'muted'} icon={row.isListed ? Eye : EyeOff}>
                        {row.isListed ? 'Active' : 'Inactive'}
                      </AdminChip>
                    )}
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>
                    <div className="relative flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenRow(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-himalayan transition-colors hover:bg-himalayan-lighter"
                        aria-label={`${row.record ? 'Edit' : 'View'} ${productName}`}
                      >
                        {row.record ? <Edit size={14} /> : <Eye size={14} />}
                        <span>{row.record ? 'Edit' : 'View'}</span>
                      </button>
                      {row.record && (
                        <button
                          type="button"
                          aria-label={`More actions for ${productName}`}
                          onClick={() => setContextMenu(contextMenu === row.id ? null : row.id)}
                          className="rounded-lg p-1.5 text-admin-muted transition-colors hover:bg-admin-canvas"
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}

                      <AnimatePresence>
                        {row.record && contextMenu === row.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="absolute right-0 top-full z-dropdown mt-1 w-48 rounded-xl border border-admin-line bg-admin-surface py-1 shadow-xl"
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenRow(row)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-admin-ink hover:bg-admin-canvas"
                            >
                              <Edit size={14} />
                              Edit product
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(row)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-admin-ink hover:bg-admin-canvas"
                            >
                              {row.isListed ? <EyeOff size={14} /> : <Eye size={14} />}
                              {row.isListed ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(row)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-admin-ink hover:bg-admin-canvas"
                            >
                              <Star size={14} className={row.isFeatured ? 'fill-amber-500 text-amber-500' : ''} />
                              {row.isFeatured ? 'Remove featured' : 'Set featured'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeleteConfirm(row.id); setContextMenu(null); }}
                              className="flex w-full items-center gap-2 border-t border-admin-line px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </AdminTable>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-admin-line px-5 py-3">
            <p className="text-sm text-admin-muted">
              Showing {((page - 1) * ADMIN_CATALOG_PER_PAGE) + 1} to{' '}
              {Math.min(page * ADMIN_CATALOG_PER_PAGE, totalCount)} of {totalCount} products
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-admin-line p-2 text-admin-muted transition-colors hover:bg-admin-canvas disabled:opacity-45"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                const pageNum = index + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-semibold transition-colors ${
                      page === pageNum
                        ? 'bg-himalayan text-white'
                        : 'text-admin-ink hover:bg-admin-canvas'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                aria-label="Next page"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-admin-line p-2 text-admin-muted transition-colors hover:bg-admin-canvas disabled:opacity-45"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Delete confirmation — the one destructive action on this screen. */}
      <AnimatePresence>
        {deleteConfirm && (
          <AdminModal
            size="sm"
            title="Delete product"
            description="This action cannot be undone."
            onClose={() => setDeleteConfirm(null)}
            footer={
              <>
                <button type="button" onClick={() => setDeleteConfirm(null)} className={BUTTON.secondary}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={actionLoading}
                  className={BUTTON.danger}
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Delete
                </button>
              </>
            }
          >
            <p className="text-sm text-admin-ink">
              Deleting removes this product from the catalog this admin reads. If you only want it to
              stop appearing on the storefront, archive it instead.
            </p>
          </AdminModal>
        )}
      </AnimatePresence>

      {contextMenu && (
        <div className="fixed inset-0 z-dropdown" onClick={() => setContextMenu(null)} />
      )}

      <ProductEditorModal
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingProduct(null); }}
        product={editingProduct}
        categories={editorCategories}
        onSave={handleSaveProduct}
      />
    </>
  );
}
