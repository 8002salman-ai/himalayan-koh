'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/supabase/api/admin';
import { supabase } from '@/lib/supabase/client';
import type { Category } from '@/lib/supabase/database.types';
import { encodePackingProfileTag } from '@/lib/shippo/packing/packingProfileTag';

interface FormState {
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: string;
  quantity: string;
  categoryId: string;
  imageUrl: string;
  weightLbs: string;
  productLength: string;
  productWidth: string;
  productHeight: string;
  boxLength: string;
  boxWidth: string;
  boxHeight: string;
  packagingWeight: string;
  unitsPerBox: string;
  maxPackedWeight: string;
  shipsSeparately: boolean;
  canMix: boolean;
  fragile: boolean;
  stackable: boolean;
}

const initialState: FormState = {
  name: '',
  slug: '',
  sku: '',
  description: '',
  price: '',
  quantity: '0',
  categoryId: '',
  imageUrl: '',
  weightLbs: '',
  productLength: '',
  productWidth: '',
  productHeight: '',
  boxLength: '',
  boxWidth: '',
  boxHeight: '',
  packagingWeight: '0.5',
  unitsPerBox: '1',
  maxPackedWeight: '70',
  shipsSeparately: false,
  canMix: false,
  fragile: false,
  stackable: true,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function positive(value: string, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be greater than 0.`);
  return number;
}

export default function NewShippingProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    adminApi.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const estimatedPackedWeight = useMemo(() => {
    const weight = Number(form.weightLbs) || 0;
    const units = Number(form.unitsPerBox) || 0;
    const packaging = Number(form.packagingWeight) || 0;
    return Math.round((weight * units + packaging) * 100) / 100;
  }, [form.weightLbs, form.unitsPerBox, form.packagingWeight]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    let productId: string | null = null;
    try {
      if (!form.name.trim()) throw new Error('Product name is required.');
      if (!form.sku.trim()) throw new Error('SKU is required.');

      const price = positive(form.price, 'Selling price');
      const weightLbs = positive(form.weightLbs, 'Product weight');
      const productLength = positive(form.productLength, 'Product length');
      const productWidth = positive(form.productWidth, 'Product width');
      const productHeight = positive(form.productHeight, 'Product height');
      const boxLength = positive(form.boxLength, 'Box length');
      const boxWidth = positive(form.boxWidth, 'Box width');
      const boxHeight = positive(form.boxHeight, 'Box height');
      const packagingWeight = Number(form.packagingWeight);
      const unitsPerBox = Math.floor(positive(form.unitsPerBox, 'Units per box'));
      const maxPackedWeight = positive(form.maxPackedWeight, 'Maximum packed weight');

      if (packagingWeight < 0) throw new Error('Packaging weight cannot be negative.');
      if (maxPackedWeight > 70) throw new Error('Maximum packed weight cannot exceed 70 lb.');
      if (estimatedPackedWeight > maxPackedWeight) {
        throw new Error(`Configured box weighs ${estimatedPackedWeight} lb, above the ${maxPackedWeight} lb limit.`);
      }

      const profile = {
        productLengthIn: productLength,
        productWidthIn: productWidth,
        productHeightIn: productHeight,
        boxLengthIn: boxLength,
        boxWidthIn: boxWidth,
        boxHeightIn: boxHeight,
        packagingWeightLbs: packagingWeight,
        unitsPerBox: form.shipsSeparately ? 1 : unitsPerBox,
        maxPackedWeightLbs: maxPackedWeight,
        shipsSeparately: form.shipsSeparately,
        canMix: form.canMix,
        fragile: form.fragile,
        stackable: form.stackable,
      };

      const image = form.imageUrl.trim();
      const saved = await adminApi.createProduct({
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        short_description: form.description.trim().slice(0, 180),
        price,
        sku: form.sku.trim(),
        weight: weightLbs,
        weight_unit: 'lbs',
        category_id: form.categoryId || undefined,
        images: image ? [image] : [],
        thumbnail: image || undefined,
        is_active: true,
        is_featured: false,
        grain_sizes: [],
        tags: [encodePackingProfileTag(profile)],
        quantity: Math.max(0, Math.floor(Number(form.quantity) || 0)),
        low_stock_threshold: 5,
        track_inventory: true,
        allow_backorder: false,
      });
      productId = saved.id;

      const { error: profileError } = await supabase.from('product_packing_profiles').upsert({
        product_id: saved.id,
        product_length_in: productLength,
        product_width_in: productWidth,
        product_height_in: productHeight,
        box_length_in: boxLength,
        box_width_in: boxWidth,
        box_height_in: boxHeight,
        packaging_weight_lbs: packagingWeight,
        units_per_box: profile.unitsPerBox,
        max_packed_weight_lbs: maxPackedWeight,
        ships_separately: form.shipsSeparately,
        can_mix: form.canMix,
        fragile: form.fragile,
        stackable: form.stackable,
      } as never);

      // The encoded product tag is a safe live fallback until migration 025 is
      // applied to the production Supabase project. Other database errors remain fatal.
      if (profileError && profileError.code !== '42P01') throw profileError;

      setSuccess('Product and shipping profile saved. Shippo will now calculate boxes from these measurements.');
      setForm(initialState);
      setTimeout(() => router.push('/admin/products'), 900);
    } catch (caught) {
      if (productId) {
        await adminApi.deleteProduct(productId).catch(() => undefined);
      }
      setError(caught instanceof Error ? caught.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  }

  const numberField = (label: string, key: keyof FormState, suffix: string, step = '0.01') => (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label} *</span>
      <div className="flex rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-amber-300">
        <input required min="0" step={step} type="number" value={String(form[key])} onChange={(e) => update(key, e.target.value as never)} className="min-w-0 flex-1 rounded-xl px-3 py-2.5 outline-none" />
        <span className="flex items-center px-3 text-slate-500">{suffix}</span>
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Catalog & shipping</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Add shipping-ready product</h1>
          <p className="mt-2 text-slate-600">Every product must include real weight, product measurements and the approved packed box. One order with multiple items is automatically split into the required Shippo parcels and labels.</p>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div>}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Product details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700"><span>Product name *</span><input required value={form.name} onChange={(e) => { update('name', e.target.value); if (!form.slug) update('slug', slugify(e.target.value)); }} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700"><span>SKU *</span><input required value={form.sku} onChange={(e) => update('sku', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700"><span>URL slug</span><input value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700"><span>Category</span><select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            {numberField('Selling price', 'price', '$')}
            {numberField('Opening stock', 'quantity', 'units', '1')}
            <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2"><span>Image URL</span><input type="url" value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="https://..." /></label>
            <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2"><span>Description</span><textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Physical product measurements</h2>
          <p className="mt-1 text-sm text-slate-600">Measure one unpacked retail unit.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {numberField('Unit weight', 'weightLbs', 'lb')}
            {numberField('Length', 'productLength', 'in')}
            {numberField('Width', 'productWidth', 'in')}
            {numberField('Height', 'productHeight', 'in')}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Approved shipping box</h2>
          <p className="mt-1 text-sm text-slate-600">Enter the outside dimensions and empty packaging weight of the box that will actually be handed to the carrier.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {numberField('Box length', 'boxLength', 'in')}
            {numberField('Box width', 'boxWidth', 'in')}
            {numberField('Box height', 'boxHeight', 'in')}
            {numberField('Empty packaging weight', 'packagingWeight', 'lb')}
            {numberField('Units per box', 'unitsPerBox', 'units', '1')}
            {numberField('Maximum packed weight', 'maxPackedWeight', 'lb')}
          </div>
          <div className={`mt-4 rounded-xl p-4 ${estimatedPackedWeight > Number(form.maxPackedWeight) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-900'}`}>
            Estimated full-box actual weight: <strong>{estimatedPackedWeight.toFixed(2)} lb</strong>. Shippo will compare actual and dimensional weight and use the billable value.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ['shipsSeparately', 'Ships separately'],
              ['canMix', 'May mix with compatible products'],
              ['fragile', 'Fragile'],
              ['stackable', 'Stackable'],
            ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form[key]} onChange={(e) => update(key, e.target.checked)} className="h-4 w-4" />{label}</label>)}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push('/admin/products')} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Cancel</button>
          <button disabled={saving} className="rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save product & packing profile'}</button>
        </div>
      </form>
    </main>
  );
}
