import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  FolderTree,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { adminApi, CategoryFormData } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import type { Category } from '../../lib/supabase/database.types';
import { categories as fallbackCategories } from '../../data/products';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setFetchError(null);

    if (!isSupabaseConfigured()) {
      setCategories(fallbackCategories.map((c, i) => ({
        id: String(i + 1),
        name: c.name,
        slug: c.name.toLowerCase().replace(/\s+/g, '-'),
        description: c.description,
        image_url: c.image,
        parent_id: null,
        sort_order: i,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));
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
  };

  const handleSave = async (data: CategoryFormData) => {
    setActionLoading(true);

    if (!isSupabaseConfigured()) {
      if (editingCategory) {
        setCategories(prev => prev.map(c => 
          c.id === editingCategory.id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
        ));
      } else {
        setCategories(prev => [...prev, {
          id: Date.now().toString(),
          ...data,
          parent_id: null,
          sort_order: prev.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Category]);
      }
      setEditorOpen(false);
      setEditingCategory(null);
      setActionLoading(false);
      return;
    }

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

    if (!isSupabaseConfigured()) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
      setActionLoading(false);
      return;
    }

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

  const handleToggleActive = async (category: Category) => {
    if (!isSupabaseConfigured()) {
      setCategories(prev => prev.map(c => 
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ));
      return;
    }

    try {
      await adminApi.updateCategory(category.id, { is_active: !category.is_active });
      setCategories(prev => prev.map(c =>
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ));
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update category.'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Categories</h1>
          <p className="text-charcoal-light">Organize your products into categories</p>
        </div>
        <button
          onClick={() => { setEditingCategory(null); setEditorOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Categories could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <button
            type="button"
            onClick={fetchCategories}
            className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start justify-between gap-3">
          <p>{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 text-red-500 hover:text-red-700 font-bold"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-himalayan" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <FolderTree size={48} className="mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-semibold text-charcoal mb-1">No categories yet</h3>
          <p className="text-charcoal-light mb-4">Create your first category to organize products</p>
          <button
            onClick={() => { setEditingCategory(null); setEditorOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="aspect-video relative bg-gray-100">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderTree size={48} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleToggleActive(category)}
                    className={`p-1.5 rounded-lg ${
                      category.is_active
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}
                    title={category.is_active ? 'Active' : 'Inactive'}
                  >
                    {category.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-charcoal">{category.name}</h3>
                <p className="text-sm text-charcoal-light line-clamp-2 mt-1">
                  {category.description || 'No description'}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-charcoal-light">
                    /{category.slug}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingCategory(category); setEditorOpen(true); }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit size={16} className="text-charcoal-light" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(category.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Category Editor Modal */}
      <CategoryEditorModal
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingCategory(null); }}
        category={editingCategory}
        onSave={handleSave}
        loading={actionLoading}
      />

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-charcoal mb-2">Delete Category</h3>
              <p className="text-charcoal-light mb-6">
                Are you sure? Products in this category will become uncategorized.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-charcoal hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Category Editor Modal Component
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
      setFormData({
        name: '',
        slug: '',
        description: '',
        image_url: '',
        is_active: true,
      });
    }
  }, [category, isOpen]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: !category ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : prev.slug,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-charcoal">
                {category ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                  placeholder="Salt for Horses"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                  placeholder="salt-for-horses"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan resize-none"
                  placeholder="Category description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                  placeholder="https://..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                />
                <span className="text-sm text-charcoal">Active (visible on site)</span>
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-charcoal hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl disabled:opacity-70"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {category ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
