import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  Plus,
  DollarSign,
  Package,
  Tag,
  Search as SearchIcon,
} from 'lucide-react';
import { adminApi, ProductFormData } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { Product, Category, Inventory } from '../../lib/supabase/database.types';
import RichTextEditor from './RichTextEditor';
import ImageDropzone from './ImageDropzone';

type ProductWithRelations = Product & { category: Category | null; inventory: Inventory | null };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithRelations | null;
  categories: Category[];
  onSave: (product: Product) => void;
}

type TabType = 'basic' | 'pricing' | 'inventory' | 'images' | 'seo';

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export default function ProductEditorModal({ isOpen, onClose, product, categories, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    sku: '',
    barcode: '',
    weight: undefined,
    weight_unit: 'lbs',
    category_id: '',
    images: [],
    thumbnail: '',
    is_active: true,
    is_featured: false,
    grain_sizes: [],
    tags: [],
    meta_title: '',
    meta_description: '',
    quantity: 0,
    low_stock_threshold: 10,
    track_inventory: true,
    allow_backorder: false,
  });

  const [newGrainSize, setNewGrainSize] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price,
        compare_at_price: product.compare_at_price || undefined,
        cost_price: product.cost_price || undefined,
        sku: product.sku || '',
        barcode: product.barcode || '',
        weight: product.weight || undefined,
        weight_unit: product.weight_unit || 'lbs',
        category_id: product.category_id || '',
        images: product.images || [],
        thumbnail: product.thumbnail || '',
        is_active: product.is_active,
        is_featured: product.is_featured,
        grain_sizes: product.grain_sizes || [],
        tags: product.tags || [],
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || '',
        quantity: product.inventory?.quantity || 0,
        low_stock_threshold: product.inventory?.low_stock_threshold || 10,
        track_inventory: product.inventory?.track_inventory !== false,
        allow_backorder: product.inventory?.allow_backorder || false,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        short_description: '',
        price: 0,
        compare_at_price: undefined,
        cost_price: undefined,
        sku: '',
        barcode: '',
        weight: undefined,
        weight_unit: 'lbs',
        category_id: '',
        images: [],
        thumbnail: '',
        is_active: true,
        is_featured: false,
        grain_sizes: [],
        tags: [],
        meta_title: '',
        meta_description: '',
        quantity: 0,
        low_stock_threshold: 10,
        track_inventory: true,
        allow_backorder: false,
      });
    }
    setActiveTab('basic');
    setError('');
  }, [product, isOpen]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: !product ? generateSlug(name) : prev.slug,
    }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        if (isSupabaseConfigured()) {
          const url = await adminApi.uploadProductImage(file, product?.id);
          newImages.push(url);
        } else {
          // For demo, use local URL
          const url = URL.createObjectURL(file);
          newImages.push(url);
        }
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
        thumbnail: prev.thumbnail || newImages[0] || '',
      }));
    } catch (err) {
      setError('Failed to upload images');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        thumbnail: prev.thumbnail === prev.images[index] 
          ? newImages[0] || '' 
          : prev.thumbnail,
      };
    });
  };

  const setAsThumbnail = (url: string) => {
    setFormData(prev => ({ ...prev, thumbnail: url }));
  };

  const addGrainSize = () => {
    if (newGrainSize.trim() && !formData.grain_sizes.includes(newGrainSize.trim())) {
      setFormData(prev => ({
        ...prev,
        grain_sizes: [...prev.grain_sizes, newGrainSize.trim()],
      }));
      setNewGrainSize('');
    }
  };

  const removeGrainSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      grain_sizes: prev.grain_sizes.filter(s => s !== size),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Product name is required');
      setActiveTab('basic');
      return;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      setActiveTab('pricing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let savedProduct: Product;

      if (!isSupabaseConfigured()) {
        // Demo mode
        savedProduct = {
          id: product?.id || Date.now().toString(),
          ...formData,
          category_id: formData.category_id || null,
          compare_at_price: formData.compare_at_price || null,
          cost_price: formData.cost_price || null,
          weight: formData.weight || null,
          created_at: product?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Product;
      } else if (product) {
        savedProduct = await adminApi.updateProduct(product.id, formData);
      } else {
        savedProduct = await adminApi.createProduct(formData);
      }

      onSave(savedProduct);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Basic Info', icon: <Package size={16} /> },
    { id: 'pricing', label: 'Pricing', icon: <DollarSign size={16} /> },
    { id: 'inventory', label: 'Inventory', icon: <Tag size={16} /> },
    { id: 'images', label: 'Images', icon: <ImageIcon size={16} /> },
    { id: 'seo', label: 'SEO', icon: <SearchIcon size={16} /> },
  ];

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
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-charcoal">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-himalayan text-himalayan'
                      : 'border-transparent text-charcoal-light hover:text-charcoal'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                      placeholder="Himalayan Pink Salt..."
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
                      placeholder="himalayan-pink-salt"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Short Description
                    </label>
                    <textarea
                      value={formData.short_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan resize-none"
                      placeholder="Brief product description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Full Description
                    </label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(description) => setFormData(prev => ({ ...prev, description }))}
                      placeholder="Detailed product description..."
                      minHeight={200}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Category
                      </label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan bg-white"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-6 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                        <span className="text-sm text-charcoal">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                        <span className="text-sm text-charcoal">Featured</span>
                      </label>
                    </div>
                  </div>

                  {/* Grain Sizes */}
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Grain Sizes / Variants
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newGrainSize}
                        onChange={(e) => setNewGrainSize(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGrainSize())}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                        placeholder="e.g., Fine (0.5mm-1mm)"
                      />
                      <button
                        type="button"
                        onClick={addGrainSize}
                        className="px-4 py-2 bg-himalayan text-white rounded-xl hover:bg-himalayan-dark transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.grain_sizes.map((size) => (
                        <span
                          key={size}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {size}
                          <button
                            type="button"
                            onClick={() => removeGrainSize(size)}
                            className="p-0.5 hover:bg-gray-200 rounded-full"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Tags
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                        placeholder="Add tag..."
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-himalayan text-white rounded-xl hover:bg-himalayan-dark transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-himalayan/10 text-himalayan rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="p-0.5 hover:bg-himalayan/20 rounded-full"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <div className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Price *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Compare at Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.compare_at_price || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: parseFloat(e.target.value) || undefined }))}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                          placeholder="Original price"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Cost Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.cost_price || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || undefined }))}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                          placeholder="Your cost"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                        placeholder="HK-SALT-001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Barcode
                      </label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                        placeholder="123456789012"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Weight
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || undefined }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Weight Unit
                      </label>
                      <select
                        value={formData.weight_unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight_unit: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan bg-white"
                      >
                        <option value="lbs">Pounds (lbs)</option>
                        <option value="oz">Ounces (oz)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="g">Grams (g)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.track_inventory}
                      onChange={(e) => setFormData(prev => ({ ...prev, track_inventory: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                    />
                    <span className="text-sm text-charcoal">Track inventory for this product</span>
                  </label>

                  {formData.track_inventory && (
                    <>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1.5">
                            Quantity in Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.quantity}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1.5">
                            Low Stock Threshold
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.low_stock_threshold}
                            onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 10 }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                          />
                          <p className="text-xs text-charcoal-light mt-1">
                            Alert when stock falls below this number
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allow_backorder}
                          onChange={(e) => setFormData(prev => ({ ...prev, allow_backorder: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                        <span className="text-sm text-charcoal">Allow customers to purchase when out of stock</span>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Images Tab */}
              {activeTab === 'images' && (
                <ImageDropzone
                  images={formData.images}
                  thumbnail={formData.thumbnail}
                  uploading={uploadingImage}
                  onUpload={handleImageUpload}
                  onRemove={removeImage}
                  onSetThumbnail={setAsThumbnail}
                  onReorder={(images) => setFormData(prev => ({ ...prev, images }))}
                />
              )}

              {/* SEO Tab */}
              {activeTab === 'seo' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={formData.meta_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
                      placeholder={formData.name || 'Product title for search engines'}
                    />
                    <p className="text-xs text-charcoal-light mt-1">
                      {formData.meta_title?.length || 0}/60 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1.5">
                      Meta Description
                    </label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan resize-none"
                      placeholder="Description for search engine results..."
                    />
                    <p className="text-xs text-charcoal-light mt-1">
                      {formData.meta_description?.length || 0}/160 characters
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="mt-6">
                    <p className="text-sm font-medium text-charcoal mb-3">Search Engine Preview</p>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                        {formData.meta_title || formData.name || 'Product Title'}
                      </p>
                      <p className="text-green-700 text-sm">
                        himalayankoh.com/products/{formData.slug || 'product-slug'}
                      </p>
                      <p className="text-charcoal-light text-sm mt-1">
                        {formData.meta_description || formData.short_description || 'Product description will appear here...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-charcoal hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-himalayan hover:bg-himalayan-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-70"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {product ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
