import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  Plus,
  Image as ImageIcon,
  DollarSign,
  Package,
  Truck,
  Tag,
  Search as SearchIcon,
} from 'lucide-react';
import { adminApi, ProductFormData } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import { decodePackingProfileTag, encodePackingProfileTag } from '../../lib/shippo/packing/packingProfileTag';
import {
  mapProductPackingProfile,
  type ProductPackingProfile,
  type ProductPackingProfileRow,
} from '../../lib/shippo/packing/productPackingProfile';
import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
} from '../../lib/images/productImageConstants';
import { optimizeProductImage } from '../../lib/images/optimizeImage';
import { isSupabaseProductImageUrl } from '../../lib/images/productImageStorage';
import {
  formatShippingWeightLabel,
  productMissingShippingWeight,
} from '../../lib/products/shippingWeight';
import type { Product, Category, Inventory } from '../../lib/supabase/database.types';
import RichTextEditor from './RichTextEditor';
import ImageDropzone from './ImageDropzone';
import {
  adminImagesToUrls,
  createAdminProductImage,
  type AdminProductImage,
} from './productImageTypes';

type ProductWithRelations = Product & { category: Category | null; inventory: Inventory | null };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithRelations | null;
  categories: Category[];
  onSave: (product: Product) => void;
}

type TabType = 'basic' | 'pricing' | 'shipping' | 'inventory' | 'images' | 'seo';

type ShippingProfileForm = Omit<ProductPackingProfile, 'productId'>;
type ShippingNumberField = Exclude<keyof ShippingProfileForm, 'shipsSeparately' | 'canMix' | 'fragile' | 'stackable'>;

const emptyShippingProfile: ShippingProfileForm = {
  productLengthIn: 0,
  productWidthIn: 0,
  productHeightIn: 0,
  boxLengthIn: 0,
  boxWidthIn: 0,
  boxHeightIn: 0,
  packagingWeightLbs: 0.5,
  unitsPerBox: 1,
  maxPackedWeightLbs: 70,
  shipsSeparately: false,
  canMix: false,
  fragile: false,
  stackable: true,
};

function profileToForm(profile: ProductPackingProfile | null): ShippingProfileForm {
  if (!profile) return emptyShippingProfile;
  const { productId: _productId, ...form } = profile;
  return form;
}

function hasCompleteShippingProfile(profile: ShippingProfileForm): boolean {
  return [
    profile.productLengthIn, profile.productWidthIn, profile.productHeightIn,
    profile.boxLengthIn, profile.boxWidthIn, profile.boxHeightIn,
    profile.unitsPerBox, profile.maxPackedWeightLbs,
  ].every((value) => Number.isFinite(value) && value > 0)
    && profile.packagingWeightLbs >= 0
    && profile.maxPackedWeightLbs <= 70;
}

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
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const [imageValidation, setImageValidation] = useState('');
  const [adminImages, setAdminImages] = useState<AdminProductImage[]>([]);
  const [error, setError] = useState('');
  const [shippingProfile, setShippingProfile] = useState<ShippingProfileForm>(emptyShippingProfile);

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
    if (!isOpen) return;

    let cancelled = false;

    const resetEditor = async () => {
      setActiveTab('basic');
      setError('');
      setImageValidation('');
      setUploadProgress({ completed: 0, total: 0 });

      if (product) {
        const grainSizes = Array.isArray(product.grain_sizes) ? product.grain_sizes : [];
        const tags = Array.isArray(product.tags) ? product.tags : [];
        let images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
        let thumbnail = product.thumbnail || images[0] || '';

        if (isSupabaseConfigured()) {
          try {
            const resolved = await adminApi.resolveProductImageList(
              product.id,
              images,
              product.thumbnail
            );
            images = resolved.images;
            thumbnail = resolved.thumbnail;
          } catch (err) {
            console.warn('Could not load normalized product images:', err);
          }
        }

        if (cancelled) return;

        const imageSlots = images.map((url) =>
          createAdminProductImage(url, {
            storageUrl: url.startsWith('http') ? url : undefined,
            status: 'uploaded',
          })
        );

        let loadedProfile = decodePackingProfileTag(product.id, tags);
        if (isSupabaseConfigured()) {
          const { data, error: profileError } = await supabase
            .from('product_packing_profiles')
            .select('*')
            .eq('product_id', product.id)
            .maybeSingle();
          if (!profileError && data) {
            loadedProfile = mapProductPackingProfile(data as ProductPackingProfileRow);
          } else if (profileError && profileError.code !== '42P01') {
            console.warn('Could not load the saved shipping profile:', profileError);
          }
        }

        setAdminImages(imageSlots);
        setShippingProfile(profileToForm(loadedProfile));
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          short_description: product.short_description || '',
          price: Number(product.price) || 0,
          compare_at_price: product.compare_at_price || undefined,
          cost_price: product.cost_price || undefined,
          sku: product.sku || '',
          barcode: product.barcode || '',
          weight: product.weight || undefined,
          weight_unit: product.weight_unit || 'lbs',
          category_id: product.category_id || '',
          images,
          thumbnail,
          is_active: product.is_active,
          is_featured: product.is_featured,
          grain_sizes: grainSizes,
          tags,
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          quantity: product.inventory?.quantity || 0,
          low_stock_threshold: product.inventory?.low_stock_threshold || 10,
          track_inventory: product.inventory?.track_inventory !== false,
          allow_backorder: product.inventory?.allow_backorder || false,
        });
        return;
      }

      setAdminImages([]);
      setShippingProfile(emptyShippingProfile);
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
    };

    void resetEditor();

    return () => {
      cancelled = true;
    };
  }, [product, isOpen]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: !product ? generateSlug(name) : prev.slug,
    }));
  };

  const syncImagesToForm = (images: AdminProductImage[], thumbnailOverride?: string) => {
    const urls = adminImagesToUrls(images);
    setFormData((prev) => ({
      ...prev,
      images: urls,
      thumbnail: thumbnailOverride
        ?? (prev.thumbnail && urls.includes(prev.thumbnail) ? prev.thumbnail : urls[0] || ''),
    }));
  };

  const validateImageFile = (file: File): string | null => {
    if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number])) {
      return `${file.name}: use JPG, PNG, WebP, or GIF.`;
    }

    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      return `${file.name}: must be 5 MB or smaller.`;
    }

    return null;
  };

  const uploadImageSlot = async (imageId: string, file: File) => {
    setAdminImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? { ...image, status: 'uploading', error: undefined }
          : image
      )
    );

    try {
      const optimized = await optimizeProductImage(file);

      if (!isSupabaseConfigured()) {
        const demoUrl = URL.createObjectURL(optimized.file);
        setAdminImages((current) => {
          const next = current.map((image) => {
            if (image.id !== imageId) return image;
            if (image.previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(image.previewUrl);
            }
            return {
              ...image,
              previewUrl: demoUrl,
              storageUrl: demoUrl,
              status: 'uploaded' as const,
              file: undefined,
              error: undefined,
            };
          });
          syncImagesToForm(next);
          return next;
        });
        return;
      }

      const remoteUrl = await adminApi.uploadProductImage(optimized.file, product?.id);

      setAdminImages((current) => {
        const next = current.map((image) => {
          if (image.id !== imageId) return image;
          if (image.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(image.previewUrl);
          }
          return {
            ...image,
            previewUrl: remoteUrl,
            storageUrl: remoteUrl,
            status: 'uploaded' as const,
            file: undefined,
            error: undefined,
          };
        });
        syncImagesToForm(next);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setAdminImages((current) =>
        current.map((image) =>
          image.id === imageId
            ? { ...image, status: 'error', error: message }
            : image
        )
      );
      throw err;
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PRODUCT_IMAGES - adminImages.length;
    if (remainingSlots <= 0) {
      setImageValidation(`You can upload up to ${MAX_PRODUCT_IMAGES} images per product.`);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    const validationErrors: string[] = [];
    const pendingSlots: AdminProductImage[] = [];

    for (const file of selectedFiles) {
      const validationError = validateImageFile(file);
      if (validationError) {
        validationErrors.push(validationError);
        continue;
      }

      pendingSlots.push(
        createAdminProductImage(URL.createObjectURL(file), {
          file,
          status: 'local',
        })
      );
    }

    if (pendingSlots.length === 0) {
      setImageValidation(validationErrors.join(' ') || 'No valid images were selected.');
      return;
    }

    setImageValidation(validationErrors.join(' '));
    setUploadingImage(true);
    setUploadProgress({ completed: 0, total: pendingSlots.length });

    const nextImages = [...adminImages, ...pendingSlots];
    setAdminImages(nextImages);
    syncImagesToForm(nextImages);

    const uploadErrors: string[] = [...validationErrors];
    let completed = 0;

    for (const slot of pendingSlots) {
      if (!slot.file) continue;
      try {
        await uploadImageSlot(slot.id, slot.file);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        uploadErrors.push(`${slot.file.name}: ${message}`);
      } finally {
        completed += 1;
        setUploadProgress({ completed, total: pendingSlots.length });
      }
    }

    if (uploadErrors.length > 0) {
      setImageValidation(uploadErrors.join(' '));
    }

    setUploadingImage(false);
  };

  const removeImage = async (imageId: string) => {
    const target = adminImages.find((image) => image.id === imageId);
    if (!target) return;

    if (target.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }

    if (isSupabaseConfigured() && target.storageUrl && isSupabaseProductImageUrl(target.storageUrl)) {
      try {
        await adminApi.deleteProductImage(target.storageUrl);
      } catch (err) {
        console.warn('Could not delete image from storage:', err);
      }
    }

    setAdminImages((current) => {
      const next = current.filter((image) => image.id !== imageId);
      const removedUrl = target.storageUrl || target.previewUrl;
      const thumbnail = formData.thumbnail === removedUrl
        ? adminImagesToUrls(next)[0] || ''
        : formData.thumbnail;
      syncImagesToForm(next, thumbnail);
      return next;
    });
  };

  const replaceImage = async (imageId: string, file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setImageValidation(validationError);
      return;
    }

    const existing = adminImages.find((image) => image.id === imageId);
    if (!existing) return;

    if (existing.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(existing.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAdminImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              previewUrl,
              storageUrl: undefined,
              status: 'local',
              file,
              error: undefined,
            }
          : image
      )
    );

    setUploadingImage(true);
    try {
      await uploadImageSlot(imageId, file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Replace failed';
      setImageValidation(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const retryImageUpload = async (imageId: string) => {
    const target = adminImages.find((image) => image.id === imageId);
    if (!target?.file) {
      setImageValidation('Original file is no longer available. Replace the image instead.');
      return;
    }

    setUploadingImage(true);
    try {
      await uploadImageSlot(imageId, target.file);
      setImageValidation('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      setImageValidation(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const setAsThumbnail = (url: string) => {
    setFormData((prev) => ({ ...prev, thumbnail: url }));
  };

  const updateShippingNumber = (key: ShippingNumberField, value: string) => {
    const parsed = Number(value);
    setShippingProfile((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const shippingNumberField = (label: string, key: ShippingNumberField, suffix: string, min = 0, step = '0.01') => (
    <label className="block text-sm font-medium text-charcoal">
      <span>{label}</span>
      <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-himalayan/30">
        <input
          type="number"
          min={min}
          step={step}
          value={shippingProfile[key] || ''}
          onChange={(event) => updateShippingNumber(key, event.target.value)}
          className="min-w-0 flex-1 px-3 py-2.5 outline-none"
        />
        <span className="flex items-center border-l border-gray-100 px-3 text-xs text-charcoal-light">{suffix}</span>
      </div>
    </label>
  );

  const reorderImages = (images: AdminProductImage[]) => {
    setAdminImages(images);
    syncImagesToForm(images);
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

    if (!product && (!formData.weight || formData.weight <= 0)) {
      setError('Shipping weight is required for new products. Enter weight in pounds (e.g. 2 for a 2 lb lick).');
      setActiveTab('pricing');
      return;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      setActiveTab('pricing');
      return;
    }

    const profileHasMeasurements = [
      shippingProfile.productLengthIn,
      shippingProfile.productWidthIn,
      shippingProfile.productHeightIn,
      shippingProfile.boxLengthIn,
      shippingProfile.boxWidthIn,
      shippingProfile.boxHeightIn,
    ].some((value) => value > 0);
    const normalizedProfile: ShippingProfileForm = {
      ...shippingProfile,
      unitsPerBox: shippingProfile.shipsSeparately ? 1 : Math.max(1, Math.floor(shippingProfile.unitsPerBox)),
    };

    if (profileHasMeasurements && !hasCompleteShippingProfile(normalizedProfile)) {
      setError('Complete every required product and box measurement before saving the shipping profile.');
      setActiveTab('shipping');
      return;
    }

    if (hasCompleteShippingProfile(normalizedProfile)) {
      const packedWeight = (Number(formData.weight) || 0) * normalizedProfile.unitsPerBox + normalizedProfile.packagingWeightLbs;
      if (packedWeight > normalizedProfile.maxPackedWeightLbs) {
        setError(`A full box weighs ${packedWeight.toFixed(2)} lb, above its ${normalizedProfile.maxPackedWeightLbs} lb limit.`);
        setActiveTab('shipping');
        return;
      }
    }

    if (uploadingImage || adminImages.some((image) => image.status === 'uploading' || image.status === 'local')) {
      setError('Please wait for image uploads to finish before saving.');
      setActiveTab('images');
      return;
    }

    if (adminImages.some((image) => image.status === 'error')) {
      setError('Remove or retry failed image uploads before saving.');
      setActiveTab('images');
      return;
    }

    const persistedImages = adminImagesToUrls(adminImages);
    const shippingTags = formData.tags.filter((tag) => !tag.startsWith('packing_profile:'));
    if (hasCompleteShippingProfile(normalizedProfile)) {
      shippingTags.push(encodePackingProfileTag(normalizedProfile));
    }

    const savePayload: ProductFormData = {
      ...formData,
      tags: shippingTags,
      images: persistedImages,
      thumbnail: formData.thumbnail || persistedImages[0] || '',
    };

    setLoading(true);
    setError('');

    try {
      let savedProduct: Product;

      if (!isSupabaseConfigured()) {
        // Demo mode
        savedProduct = {
          id: product?.id || Date.now().toString(),
          ...savePayload,
          category_id: formData.category_id || null,
          compare_at_price: formData.compare_at_price || null,
          cost_price: formData.cost_price || null,
          weight: formData.weight || null,
          created_at: product?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Product;
      } else if (product) {
        savedProduct = await adminApi.updateProduct(product.id, savePayload);
      } else {
        savedProduct = await adminApi.createProduct(savePayload);
      }

      if (isSupabaseConfigured() && hasCompleteShippingProfile(normalizedProfile)) {
        const { error: profileError } = await supabase.from('product_packing_profiles').upsert({
          product_id: savedProduct.id,
          product_length_in: normalizedProfile.productLengthIn,
          product_width_in: normalizedProfile.productWidthIn,
          product_height_in: normalizedProfile.productHeightIn,
          box_length_in: normalizedProfile.boxLengthIn,
          box_width_in: normalizedProfile.boxWidthIn,
          box_height_in: normalizedProfile.boxHeightIn,
          packaging_weight_lbs: normalizedProfile.packagingWeightLbs,
          units_per_box: normalizedProfile.unitsPerBox,
          max_packed_weight_lbs: normalizedProfile.maxPackedWeightLbs,
          ships_separately: normalizedProfile.shipsSeparately,
          can_mix: normalizedProfile.canMix,
          fragile: normalizedProfile.fragile,
          stackable: normalizedProfile.stackable,
        } as never);
        if (profileError && profileError.code !== '42P01') throw profileError;
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
    { id: 'shipping', label: 'Shippo Packing', icon: <Truck size={16} /> },
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
                      value={formData.description ?? ''}
                      onChange={(description) => setFormData(prev => ({ ...prev, description }))}
                      placeholder="Detailed product description..."
                      minHeight={200}
                    />
                  </div>

                  <section className="rounded-2xl border border-himalayan/20 bg-himalayan/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-himalayan">Shipping measurements</h3>
                        <p className="mt-1 text-sm text-charcoal-light">
                          Enter the actual size of one retail unit. Box, packaging, and multi-parcel settings are in Shippo Packing.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('shipping')}
                        className="shrink-0 rounded-lg border border-himalayan/30 bg-white px-3 py-2 text-sm font-semibold text-himalayan hover:bg-himalayan/10 transition-colors"
                      >
                        Open Shippo Packing
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                      <label className="block text-sm font-medium text-charcoal">
                        <span>Unit weight</span>
                        <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-himalayan/30">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={formData.weight || ''}
                            onChange={(event) => setFormData((current) => ({ ...current, weight: Number(event.target.value) || undefined }))}
                            className="min-w-0 flex-1 px-3 py-2.5 outline-none"
                            placeholder="e.g. 2"
                          />
                          <span className="flex items-center border-l border-gray-100 px-3 text-xs text-charcoal-light">{formData.weight_unit || 'lbs'}</span>
                        </div>
                      </label>
                      {shippingNumberField('Length', 'productLengthIn', 'in')}
                      {shippingNumberField('Width', 'productWidthIn', 'in')}
                      {shippingNumberField('Height', 'productHeightIn', 'in')}
                    </div>

                    <p className="mt-3 text-xs text-charcoal-light">
                      {hasCompleteShippingProfile(shippingProfile)
                        ? 'Shipping profile complete — Shippo can use the saved box rules.'
                        : 'Finish box dimensions, packaging weight, and units per box in Shippo Packing before this listing is shipping-ready.'}
                    </p>
                  </section>

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
                  <div className="rounded-xl border border-himalayan/20 bg-himalayan/5 px-4 py-3 text-sm text-charcoal">
                    <p className="font-semibold text-himalayan">Shipping weight {!product ? '(required)' : ''}</p>
                    <p className="mt-1 text-charcoal-light">
                      Used for live Shippo carrier rates and box packing. New listings must include weight. Common values: 2, 4, 6 lb licks · 3 or 6 lb pouches · 1 lb jar · 18 or 45 lb bags.
                    </p>
                  </div>

                  {product && productMissingShippingWeight(formData.weight) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      <p className="font-semibold">This listing has no shipping weight yet</p>
                      <p className="mt-1">
                        The product stays active and uses catalog box rules for now. Add weight below so future orders get the most accurate shipping rates.
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Shipping weight {!product ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required={!product}
                        value={formData.weight || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || undefined }))}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan ${
                          !product && productMissingShippingWeight(formData.weight)
                            ? 'border-amber-300 bg-amber-50/50'
                            : 'border-gray-200'
                        }`}
                        placeholder="e.g. 2"
                      />
                      {formData.weight && formData.weight > 0 && (
                        <p className="text-xs text-green-700 mt-1">
                          Saved as {formatShippingWeightLabel(formData.weight, formData.weight_unit)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-1.5">
                        Weight unit
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
                </div>
              )}

              {/* Shippo Packing Tab */}
              {activeTab === 'shipping' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-himalayan/20 bg-himalayan/5 px-4 py-3 text-sm text-charcoal">
                    <p className="font-semibold text-himalayan">Shippo packing profile</p>
                    <p className="mt-1 text-charcoal-light">
                      Save the real product and shipping-box measurements. Shippo uses these values to split multi-item orders into accurate parcels and calculate carrier rates.
                    </p>
                  </div>

                  {!hasCompleteShippingProfile(shippingProfile) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      Measurements are not complete yet. Fill all product and box fields before saving to make this listing shipping-ready.
                    </div>
                  )}

                  <section>
                    <h3 className="font-semibold text-charcoal">Product measurements</h3>
                    <p className="mt-1 text-sm text-charcoal-light">Measure one unpacked retail unit.</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
                      {shippingNumberField('Length', 'productLengthIn', 'in')}
                      {shippingNumberField('Width', 'productWidthIn', 'in')}
                      {shippingNumberField('Height', 'productHeightIn', 'in')}
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-charcoal">
                        <p className="font-medium">Unit weight</p>
                        <p className="mt-1 text-charcoal-light">{formData.weight ? formatShippingWeightLabel(formData.weight, formData.weight_unit) : 'Set in Pricing tab'}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-charcoal-light">Unit weight is set in the Pricing tab.</p>
                  </section>

                  <section>
                    <h3 className="font-semibold text-charcoal">Approved shipping box</h3>
                    <p className="mt-1 text-sm text-charcoal-light">Use the actual outside dimensions of the box handed to the carrier.</p>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {shippingNumberField('Box length', 'boxLengthIn', 'in')}
                      {shippingNumberField('Box width', 'boxWidthIn', 'in')}
                      {shippingNumberField('Box height', 'boxHeightIn', 'in')}
                      {shippingNumberField('Empty packaging weight', 'packagingWeightLbs', 'lb')}
                      {shippingNumberField('Units per box', 'unitsPerBox', 'units', 1, '1')}
                      {shippingNumberField('Maximum packed weight', 'maxPackedWeightLbs', 'lb')}
                    </div>
                    <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-charcoal">
                      Estimated full-box actual weight: <strong>{(((Number(formData.weight) || 0) * (shippingProfile.shipsSeparately ? 1 : shippingProfile.unitsPerBox)) + shippingProfile.packagingWeightLbs).toFixed(2)} lb</strong>.
                      Shippo compares this with dimensional weight for its billable rate.
                    </div>
                  </section>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ['shipsSeparately', 'Ships separately'],
                      ['canMix', 'May mix with compatible products'],
                      ['fragile', 'Fragile'],
                      ['stackable', 'Stackable'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm font-medium text-charcoal">
                        <input
                          type="checkbox"
                          checked={shippingProfile[key]}
                          onChange={(event) => setShippingProfile((current) => ({ ...current, [key]: event.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                        />
                        {label}
                      </label>
                    ))}
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
                  images={adminImages}
                  thumbnail={formData.thumbnail || ''}
                  uploading={uploadingImage}
                  uploadProgress={uploadProgress}
                  validationMessage={imageValidation}
                  onUpload={handleImageUpload}
                  onRemove={removeImage}
                  onReplace={replaceImage}
                  onRetry={retryImageUpload}
                  onSetThumbnail={setAsThumbnail}
                  onReorder={reorderImages}
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
