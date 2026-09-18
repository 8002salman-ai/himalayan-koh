import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Loader2, FolderTree, Eye, EyeOff, X } from 'lucide-react';
import { adminApi, CategoryFormData } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { isSupabaseDataSource } from '../../lib/backend/dataSource';
import { fetchAdminCatalogPage } from '../../lib/admin/adminCatalogClient';
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
  type AdminCategory,
} from '../../lib/admin/wooCategoryApi';
import type { AdminCatalogRow } from '../../lib/backend/adminCatalog';
import { getErrorMessage } from '../../lib/errors';
import type { Category } from '../../lib/supabase/database.types';
import {
  AdminButton,
  AdminChip,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingPanel,
  AdminStatTile,
} from '../../components/admin/AdminUI';
import {
  BUTTON,
  ICON_TILE,
  ICON_TILE_TONES,
  INPUT,
  MICRO_LABEL,
  SURFACE,
} from '../../components/admin/adminTheme';

/**
 * Categories.
 *
 * The screen follows the catalog's owner rather than its own convenience.
 *
 *  - Supabase catalog: the real category rows, with create/edit/delete through
 *    the Supabase admin query layer, exactly as before.
 *  - WooCommerce catalog: the store's own taxonomy, read and written through
 *    `/api/admin/categories`, which holds the credentials server-side. The screen
 *    used to say category editing was "not connected" while the same process had
 *    a working WooCommerce write path for products — the connection existed, the
 *    screen just did not use it.
 *
 * What the write path refuses is deliberate: a slug another term already holds
 * (no `-2` suffix invented behind the owner's back) and a delete while products
 * are still filed under the term (WooCommerce would move them to Uncategorized
 * and report success). Both come back as the store's own message.
 *
 * The old fallback to the bundled demo categories when nothing was configured is
 * gone: a fabricated taxonomy under a real storefront's name is worse than an
 * empty screen.
 */
export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<AdminCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  /** The store's own taxonomy, on the WooCommerce deployment. */
  const [wooCategories, setWooCategories] = useState<AdminCategory[]>([]);
  const [wooEditorOpen, setWooEditorOpen] = useState(false);
  const [wooEditing, setWooEditing] = useState<AdminCategory | null>(null);
  const [wooDeleteTarget, setWooDeleteTarget] = useState<AdminCategory | null>(null);

  /** Which catalog owns the taxonomy on this deployment. */
  const READS_SUPABASE_CATALOG = isSupabaseDataSource();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    // WooCommerce: the catalog read model plus the store's own taxonomy.
    if (!READS_SUPABASE_CATALOG) {
      try {
        const [page, terms] = await Promise.all([
          fetchAdminCatalogPage({ perPage: 100, sort: 'name' }),
          listAdminCategories(),
        ]);
        setRows(page.rows);
        setWooCategories(terms);
      } catch (err) {
        setFetchError(getErrorMessage(err, 'Failed to read the WooCommerce catalog.'));
        setRows([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isSupabaseConfigured()) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      const data = await adminApi.getCategories();
      setCategories(data);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load categories.'));
    } finally {
      setLoading(false);
    }
  }, [READS_SUPABASE_CATALOG]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async (data: CategoryFormData) => {
    setActionLoading(true);
    try {
      if (editingCategory) {
        const updated = await adminApi.updateCategory(editingCategory.id, data);
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await adminApi.createCategory(data);
        setCategories(prev => [...prev, created]);
      }
      setEditorOpen(false);
      setEditingCategory(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to save category.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await adminApi.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to delete category.'));
    } finally {
      setActionLoading(false);
    }
  };

  /** Saves through WooCommerce and re-reads, so the list shows the store's row. */
  const handleWooSave = async (input: { name: string; slug: string; description: string }) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (wooEditing) await updateAdminCategory(wooEditing.id, input);
      else await createAdminCategory(input);
      setWooEditorOpen(false);
      setWooEditing(null);
      await fetchCategories();
    } catch (err) {
      setActionError(getErrorMessage(err, 'WooCommerce did not save that category.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleWooDelete = async (category: AdminCategory) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteAdminCategory(category.id);
      setWooDeleteTarget(null);
      await fetchCategories();
    } catch (err) {
      // The store refuses a delete while products are filed under the term; its
      // own sentence is the message, so it is shown rather than replaced.
      setActionError(getErrorMessage(err, 'WooCommerce did not delete that category.'));
      setWooDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await adminApi.updateCategory(category.id, { is_active: !category.is_active });
      setCategories(prev => prev.map(c =>
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ));
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update category.'));
    }
  };

  // WooCommerce taxonomy, counted from the products the read model actually
  // returned. A category with no product in that read is not invented.
  const wooFacets = new Map<string, number>();
  for (const row of rows) {
    if (!row.categoryName) continue;
    wooFacets.set(row.categoryName, (wooFacets.get(row.categoryName) ?? 0) + 1);
  }
  const uncategorised = rows.filter((row) => !row.categoryName).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Categories"
        description={
          READS_SUPABASE_CATALOG
            ? 'The category taxonomy the storefront groups products by.'
            : 'The WooCommerce taxonomy the storefront groups products by, read through the shared catalog.'
        }
        actions={
          <AdminButton
            variant="primary"
            icon={Plus}
            onClick={() => {
              if (READS_SUPABASE_CATALOG) {
                setEditingCategory(null);
                setEditorOpen(true);
                return;
              }
              setWooEditing(null);
              setWooEditorOpen(true);
            }}
          >
            Add category
          </AdminButton>
        }
      />

      {fetchError && (
        <AdminNotice
          tone="danger"
          title="Categories could not be loaded"
          action={<AdminButton onClick={fetchCategories}>Retry</AdminButton>}
        >
          {fetchError}
        </AdminNotice>
      )}

      {actionError && (
        <AdminNotice
          tone="danger"
          title="That change was not saved"
          action={<AdminButton icon={X} onClick={() => setActionError(null)}>Dismiss</AdminButton>}
        >
          {actionError}
        </AdminNotice>
      )}

      {!READS_SUPABASE_CATALOG && (
        <div className="grid grid-cols-4 gap-4">
          <AdminStatTile
            label="Categories in use"
            icon={FolderTree}
            tone="brand"
            value={loading ? undefined : wooFacets.size}
            unavailable={loading ? 'Reading…' : undefined}
            hint="WooCommerce"
          />
          <AdminStatTile
            label="Products read"
            icon={FolderTree}
            tone="green"
            value={loading ? undefined : rows.length}
            unavailable={loading ? 'Reading…' : undefined}
          />
          <AdminStatTile
            label="Uncategorised"
            icon={FolderTree}
            tone="amber"
            value={loading ? undefined : uncategorised}
            unavailable={loading ? 'Reading…' : undefined}
          />
          <AdminStatTile
            label="Editable here"
            icon={FolderTree}
            tone="slate"
            value={loading ? undefined : wooCategories.length}
            unavailable={loading ? 'Reading…' : undefined}
            hint="Written to WooCommerce"
          />
        </div>
      )}

      {loading ? (
        <AdminPanel title="Categories" description="Reading the catalog…">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-admin-canvas" />
            ))}
          </div>
        </AdminPanel>
      ) : READS_SUPABASE_CATALOG ? (
        categories.length === 0 ? (
          <AdminPanel title="Categories">
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
                <FolderTree size={20} />
              </span>
              <p className="text-sm font-semibold text-admin-ink">No categories yet</p>
              <p className="text-sm text-admin-muted">
                {isSupabaseConfigured()
                  ? 'Create the first category to group products.'
                  : 'No catalog source is configured, so there is no taxonomy to read.'}
              </p>
            </div>
          </AdminPanel>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <motion.article
                key={category.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`${SURFACE} overflow-hidden`}
              >
                <div className="relative flex aspect-video items-center justify-center bg-admin-canvas">
                  {category.image_url ? (
                    <img src={category.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FolderTree size={40} className="text-admin-muted/50" />
                  )}
                  <div className="absolute right-2 top-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(category)}
                      className={`rounded-lg p-1.5 text-white ${category.is_active ? 'bg-emerald-500' : 'bg-slate-500'}`}
                      title={category.is_active ? 'Active — click to hide' : 'Inactive — click to show'}
                      aria-label={category.is_active ? 'Deactivate category' : 'Activate category'}
                    >
                      {category.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-admin-ink">{category.name}</h3>
                    <AdminChip tone={category.is_active ? 'success' : 'muted'}>
                      {category.is_active ? 'Visible' : 'Hidden'}
                    </AdminChip>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-admin-muted">
                    {category.description || 'No description'}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-admin-muted">/{category.slug}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingCategory(category); setEditorOpen(true); }}
                        className="rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(category.id)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )
      ) : (
        <>
          <AdminPanel
            title="Taxonomy in use"
            description="Every category the catalog read returned, with the products counted in that same read."
          >
            {wooFacets.size === 0 ? (
              <p className="text-sm text-admin-muted">
                No category was reported by the catalog source. Products without one are counted as
                uncategorised rather than filed under a guess.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[...wooFacets.entries()].map(([name, count]) => (
                  <div key={name} className="rounded-xl border border-admin-line px-4 py-3.5">
                    <p className="font-semibold text-admin-ink">{name}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-muted">
                      {count} product{count === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
                {uncategorised > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <p className="font-semibold text-amber-900">Uncategorised</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                      {uncategorised} product{uncategorised === 1 ? '' : 's'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Taxonomy"
            description="Every category in the store, with the product count WooCommerce reports for it. Edits are written to WooCommerce and re-read from it."
          >
            {wooCategories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
                  <FolderTree size={20} />
                </span>
                <p className="text-sm font-semibold text-admin-ink">No categories yet</p>
                <p className="text-sm text-admin-muted">
                  WooCommerce reported no product categories. Create the first one to group products.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-admin-line">
                {wooCategories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-admin-ink">{category.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-admin-muted">
                        /{category.slug} · WooCommerce id {category.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <AdminChip tone={category.count > 0 ? 'success' : 'muted'}>
                        {category.count} product{category.count === 1 ? '' : 's'}
                      </AdminChip>
                      <button
                        type="button"
                        onClick={() => {
                          setWooEditing(category);
                          setWooEditorOpen(true);
                        }}
                        className="rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWooDeleteTarget(category)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </>
      )}

      <CategoryEditorModal
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingCategory(null); }}
        category={editingCategory}
        onSave={handleSave}
        loading={actionLoading}
      />

      <WooCategoryEditorModal
        isOpen={wooEditorOpen}
        onClose={() => { setWooEditorOpen(false); setWooEditing(null); }}
        category={wooEditing}
        onSave={handleWooSave}
        loading={actionLoading}
      />

      <AnimatePresence>
        {wooDeleteTarget && (
          <AdminModal
            size="sm"
            title="Delete category"
            description="The category is removed from WooCommerce. Products are not deleted."
            onClose={() => setWooDeleteTarget(null)}
            footer={
              <>
                <AdminButton onClick={() => setWooDeleteTarget(null)}>Cancel</AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={() => handleWooDelete(wooDeleteTarget)}
                  disabled={actionLoading}
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Delete
                </AdminButton>
              </>
            }
          >
            <p className="text-sm text-admin-ink">
              <span className="font-semibold">{wooDeleteTarget.name}</span> currently holds{' '}
              {wooDeleteTarget.count} product{wooDeleteTarget.count === 1 ? '' : 's'}. WooCommerce refuses
              the delete while products are still filed under it, because it would move them to
              Uncategorized.
            </p>
          </AdminModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <AdminModal
            size="sm"
            title="Delete category"
            description="This action cannot be undone."
            onClose={() => setDeleteConfirm(null)}
            footer={
              <>
                <AdminButton onClick={() => setDeleteConfirm(null)}>Cancel</AdminButton>
                <AdminButton variant="danger" onClick={() => handleDelete(deleteConfirm)} disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Delete
                </AdminButton>
              </>
            }
          >
            <p className="text-sm text-admin-ink">
              Products filed under this category become uncategorized; they are not deleted.
            </p>
          </AdminModal>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Category editor for the WooCommerce deployment.
 *
 * Same three fields the store actually owns — name, slug, description — and no
 * image or visibility control, because WooCommerce product categories have
 * neither: the Supabase screen's image/active columns are a Supabase shape, and
 * offering them here would mean inventing fields the store would silently drop.
 *
 * The slug is only generated from the name for a *new* category. On an edit it is
 * whatever the owner typed: the slug is a public URL, so it is never recomputed
 * behind their back.
 */
function WooCategoryEditorModal({
  isOpen,
  onClose,
  category,
  onSave,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  category: AdminCategory | null;
  onSave: (input: { name: string; slug: string; description: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  useEffect(() => {
    setForm({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
    });
  }, [category, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({ name: form.name, slug: form.slug, description: form.description });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <AdminModal
          title={category ? 'Edit category' : 'Add category'}
          description={
            category
              ? 'Written to WooCommerce. Changing the slug changes the public category URL.'
              : 'Written to WooCommerce as a new product category.'
          }
          onClose={onClose}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="woo-category-name" className={MICRO_LABEL}>
                Category name *
              </label>
              <input
                id="woo-category-name"
                type="text"
                required
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: category
                      ? prev.slug
                      : name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, ''),
                  }));
                }}
                className={`${INPUT} mt-1.5 w-full`}
                placeholder="Salt Licks"
              />
            </div>

            <div>
              <label htmlFor="woo-category-slug" className={MICRO_LABEL}>
                URL slug
              </label>
              <input
                id="woo-category-slug"
                type="text"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                className={`${INPUT} mt-1.5 w-full`}
                placeholder="salt-licks"
              />
              <p className="mt-1 text-[11px] text-admin-muted">
                Lowercase letters, numbers and hyphens. A slug another category already uses is
                refused — not renamed.
              </p>
            </div>

            <div>
              <label htmlFor="woo-category-description" className={MICRO_LABEL}>
                Description
              </label>
              <textarea
                id="woo-category-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className={`${INPUT} mt-1.5 w-full resize-none`}
                placeholder="Category description…"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-admin-line pt-4">
              <AdminButton onClick={onClose}>Cancel</AdminButton>
              <button type="submit" disabled={loading} className={BUTTON.primary}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                {category ? 'Save changes' : 'Create category'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </AnimatePresence>
  );
}

/** Category editor. Supabase catalog only — the WooCommerce branch has no write path. */
function CategoryEditorModal({
  isOpen,
  onClose,
  category,
  onSave,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSave: (data: CategoryFormData) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image_url: category.image_url || '',
        is_active: category.is_active,
      });
    } else {
      setFormData({ name: '', slug: '', description: '', image_url: '', is_active: true });
    }
  }, [category, isOpen]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: !category ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : prev.slug,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <AdminModal
          title={category ? 'Edit category' : 'Add category'}
          description="Written to the Supabase catalog — the WooCommerce branch has no write path yet."
          onClose={onClose}
          bodyClassName="px-0 py-0"
        >
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label htmlFor="category-name" className={MICRO_LABEL}>
                  Category name *
                </label>
                <input
                  id="category-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className={`${INPUT} mt-1.5 w-full`}
                  placeholder="Salt for Horses"
                />
              </div>

              <div>
                <label htmlFor="category-slug" className={MICRO_LABEL}>
                  URL slug
                </label>
                <input
                  id="category-slug"
                  type="text"
                  value={formData.slug}
                  onChange={(event) => setFormData(prev => ({ ...prev, slug: event.target.value }))}
                  className={`${INPUT} mt-1.5 w-full`}
                  placeholder="salt-for-horses"
                />
              </div>

              <div>
                <label htmlFor="category-description" className={MICRO_LABEL}>
                  Description
                </label>
                <textarea
                  id="category-description"
                  value={formData.description}
                  onChange={(event) => setFormData(prev => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className={`${INPUT} mt-1.5 w-full resize-none`}
                  placeholder="Category description…"
                />
              </div>

              <div>
                <label htmlFor="category-image" className={MICRO_LABEL}>
                  Image URL
                </label>
                <input
                  id="category-image"
                  type="url"
                  value={formData.image_url}
                  onChange={(event) => setFormData(prev => ({ ...prev, image_url: event.target.value }))}
                  className={`${INPUT} mt-1.5 w-full`}
                  placeholder="https://…"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-ink">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) => setFormData(prev => ({ ...prev, is_active: event.target.checked }))}
                  className="h-4 w-4 rounded border-admin-line-strong text-himalayan focus:ring-himalayan"
                />
                Active (visible on site)
              </label>

              <div className="flex justify-end gap-2 border-t border-admin-line pt-4">
                <AdminButton onClick={onClose}>Cancel</AdminButton>
                <button type="submit" disabled={loading} className={BUTTON.primary}>
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {category ? 'Save changes' : 'Create category'}
                </button>
              </div>
            </form>
        </AdminModal>
      )}
    </AnimatePresence>
  );
}
