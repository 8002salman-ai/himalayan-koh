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
  Layers,
  Archive,
} from 'lucide-react';
import { adminApi, AdminProductFilters } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import type { Product, Category, Inventory } from '../../lib/supabase/database.types';
import { products as fallbackProducts, categories as fallbackCategories } from '../../data/products';
import {
  formatShippingWeightLabel,
  productMissingShippingWeight,
} from '../../lib/products/shippingWeight';
import ProductEditorModal from '../../components/admin/ProductEditorModal';

type ProductWithRelations = Product & { category: Category | null; inventory: Inventory | null };

type ProductStats = {
  total: number;
  active: number;
  inactive: number;
  featured: number;
  lowStock: number;
  outOfStock: number;
};

function asNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function productImages(product: ProductWithRelations) {
  return Array.isArray(product.images) ? product.images.filter(Boolean) : [];
}

function inventoryBadge(product: ProductWithRelations) {
  const inv = product.inventory;
  if (!inv?.track_inventory) {
    return { label: 'Not tracked', className: 'bg-gray-100 text-gray-600' };
  }
  if (inv.quantity <= 0) {
    return { label: 'Out of stock', className: 'bg-red-100 text-red-700' };
  }
  if (inv.quantity <= inv.low_stock_threshold) {
    return { label: 'Low stock', className: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'In stock', className: 'bg-green-100 text-green-700' };
}

export default function AdminProducts() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || searchParams.get('filter') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'price_asc' | 'price_desc'>('newest');
  const [productStats, setProductStats] = useState<ProductStats | null>(null);

  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      // Use fallback data
      const filtered = fallbackProducts.filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (categoryFilter && !p.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
        return true;
      });

      setProducts(filtered.map(p => ({
        id: String(p.id),
        name: p.name,
        slug: p.name.toLowerCase().replace(/\s+/g, '-'),
        description: p.description || null,
        short_description: p.description || null,
        price: p.priceMin,
        compare_at_price: p.priceMax || null,
        cost_price: null,
        sku: `SKU-${p.id}`,
        barcode: null,
        weight: null,
        weight_unit: 'lbs',
        category_id: null,
        images: [p.image],
        thumbnail: p.image,
        is_active: p.inStock,
        is_featured: p.isFeatured || false,
        grain_sizes: p.grainSizes || [],
        tags: [],
        meta_title: null,
        meta_description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: { id: '1', name: p.category, slug: p.category.toLowerCase(), description: null, image_url: null, parent_id: null, sort_order: 0, is_active: true, created_at: '', updated_at: '' },
        inventory: { id: '1', product_id: String(p.id), quantity: 100, reserved_quantity: 0, low_stock_threshold: 10, track_inventory: true, allow_backorder: false, created_at: '', updated_at: '' },
      })) as ProductWithRelations[]);

      setCategories(fallbackCategories.map((c, i) => ({
        id: String(i),
        name: c.name,
        slug: c.name.toLowerCase().replace(/\s+/g, '-'),
        description: c.description,
        image_url: c.image,
        parent_id: null,
        sort_order: i,
        is_active: true,
        created_at: '',
        updated_at: '',
      })));

      setTotalCount(filtered.length);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      const filters: AdminProductFilters = {
        search: search || undefined,
        category_id: categoryFilter || undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        is_featured: statusFilter === 'featured' ? true : undefined,
        low_stock: statusFilter === 'low_stock' ? true : undefined,
        sortBy: sortBy === 'name' ? 'name' : sortBy === 'price_asc' || sortBy === 'price_desc' ? 'price' : 'created_at',
        sortOrder: sortBy === 'price_asc' || sortBy === 'name' ? 'asc' : 'desc',
        page,
        limit: 10,
      };

      const [productsResult, categoriesResult, statsResult] = await Promise.all([
        adminApi.getProducts(filters),
        adminApi.getCategories(),
        adminApi.getProductManagementStats(),
      ]);
      setProductStats(statsResult);

      setProducts((productsResult.products || []).filter(Boolean));
      setTotalCount(productsResult.count);
      setTotalPages(productsResult.totalPages);
      setCategories(categoriesResult);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to load products. Please refresh and try again.'));
      setProducts([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, page, sortBy, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchProducts())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchProducts]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params);
  }, [search, categoryFilter, statusFilter, page, setSearchParams]);

  const handleEdit = (product: ProductWithRelations) => {
    setEditingProduct(product);
    setEditorOpen(true);
    setContextMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured()) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete product. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (product: ProductWithRelations) => {
    if (!isSupabaseConfigured()) {
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
      return;
    }

    try {
      await adminApi.updateProduct(product.id, { is_active: !product.is_active });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update product status.'));
    }
    setContextMenu(null);
  };

  const handleToggleFeatured = async (product: ProductWithRelations) => {
    if (!isSupabaseConfigured()) {
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
      ));
      return;
    }

    try {
      await adminApi.updateProduct(product.id, { is_featured: !product.is_featured });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
      ));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update featured status.'));
    }
    setContextMenu(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (!isSupabaseConfigured()) {
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.bulkDeleteProducts(selectedIds);
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete selected products.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProduct = () => {
    fetchProducts();
    setEditorOpen(false);
    setEditingProduct(null);
  };

  const selectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const missingWeightCount = products.filter((p) => productMissingShippingWeight(p.weight)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Products</h1>
          <p className="text-charcoal-light">Manage your product catalog</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setEditorOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {missingWeightCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Add shipping weight to {missingWeightCount} listing{missingWeightCount > 1 ? 's' : ''}</p>
          <p className="mt-1 text-amber-900/90">
            Products without weight still stay active and use catalog box rules, but each listing should have weight (lbs) for accurate Shippo rates. Edit the product and fill in <strong>Shipping weight</strong> on the Pricing tab.
          </p>
        </div>
      )}

      {productStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: productStats.total, icon: Package },
            { label: 'Active', value: productStats.active, icon: Eye },
            { label: 'Inactive', value: productStats.inactive, icon: EyeOff },
            { label: 'Featured', value: productStats.featured, icon: Star },
            { label: 'Low Stock', value: productStats.lowStock, icon: AlertTriangle },
            { label: 'Out of Stock', value: productStats.outOfStock, icon: Archive },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 text-charcoal-light mb-1">
                <stat.icon size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-charcoal">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan bg-white"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured</option>
            <option value="low_stock">Low Stock</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan bg-white"
          >
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          {/* Reset */}
          {(search || categoryFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); setPage(1); }}
              className="px-4 py-2.5 text-charcoal-light hover:text-charcoal border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4"
          >
            <span className="text-sm text-charcoal-light">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-charcoal-light hover:text-charcoal"
            >
              Clear selection
            </button>
          </motion.div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={40} />}
            title="No products found"
            description={
              search || categoryFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'
            }
            action={
              !search && !categoryFilter && !statusFilter
                ? { label: 'Add Product', onClick: () => { setEditingProduct(null); setEditorOpen(true); } }
                : undefined
            }
            size="compact"
            className="border-0 shadow-none rounded-none py-20"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === products.length}
                        onChange={selectAll}
                        className="rounded border-gray-300 text-himalayan focus:ring-himalayan"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-charcoal-light uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => {
                    const images = productImages(product);
                    const price = asNumber(product.price);
                    const compareAtPrice = product.compare_at_price == null ? null : asNumber(product.compare_at_price);
                    const productName = product.name || 'Untitled product';

                    return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, product.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== product.id));
                            }
                          }}
                          className="rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.thumbnail || images[0] || ''}
                            alt={productName}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-charcoal truncate max-w-[200px]">
                              {productName}
                            </p>
                            <p className="text-xs text-charcoal-light">
                              SKU: {product.sku || 'N/A'}
                              {!productMissingShippingWeight(product.weight) && (
                                <> · Ship: {formatShippingWeightLabel(product.weight, product.weight_unit)}</>
                              )}
                            </p>
                            {productMissingShippingWeight(product.weight) && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                <AlertTriangle size={10} />
                                Add shipping weight
                              </span>
                            )}
                          </div>
                          {product.is_featured && (
                            <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-charcoal">
                          {product.category?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-charcoal">
                            ${price.toFixed(2)}
                          </p>
                          {compareAtPrice && (
                            <p className="text-xs text-charcoal-light line-through">
                              ${compareAtPrice.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.inventory ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                product.inventory.quantity <= product.inventory.low_stock_threshold
                                  ? 'text-red-600'
                                  : 'text-charcoal'
                              }`}>
                                {product.inventory.quantity}
                              </span>
                              {product.inventory.quantity <= product.inventory.low_stock_threshold && (
                                <AlertTriangle size={14} className="text-red-500" />
                              )}
                            </div>
                            {(() => {
                              const badge = inventoryBadge(product);
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.className}`}>
                                  <Layers size={10} />
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-charcoal-light">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.is_active ? (
                            <>
                              <Eye size={12} />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setContextMenu(contextMenu === product.id ? null : product.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={16} className="text-charcoal-light" />
                          </button>

                          <AnimatePresence>
                            {contextMenu === product.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20"
                              >
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                                >
                                  <Edit size={14} />
                                  Edit Product
                                </button>
                                <button
                                  onClick={() => handleToggleActive(product)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                                >
                                  {product.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                                  {product.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleToggleFeatured(product)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-charcoal hover:bg-gray-50"
                                >
                                  <Star size={14} className={product.is_featured ? 'fill-amber-500 text-amber-500' : ''} />
                                  {product.is_featured ? 'Remove Featured' : 'Set Featured'}
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => { setDeleteConfirm(product.id); setContextMenu(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-charcoal-light">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} products
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-himalayan text-white'
                            : 'hover:bg-gray-100 text-charcoal'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
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
              <h3 className="text-lg font-bold text-charcoal mb-2">Delete Product</h3>
              <p className="text-charcoal-light mb-6">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Editor Modal */}
      <ProductEditorModal
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingProduct(null); }}
        product={editingProduct}
        categories={categories}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
