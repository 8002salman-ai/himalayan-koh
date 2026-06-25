import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import {
  CATEGORY_FILTER_TABS,
  buildProductsCategoryPath,
  filterLabelFromKey,
  getCategoryContent,
} from '../../lib/categoryContent';
import type { CategoryHubOverrideForm } from '../../lib/categoryContent/cmsTypes';
import type { CategoryContentKey } from '../../lib/categoryContent';
import type { CategoryTrustPoint } from '../../lib/categoryContent';
import { categoryHubApi } from '../../lib/supabase/api/categoryHub';
import { isSupabaseConfigured } from '../../lib/supabase/client';

const inputClass =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30';

const editableKeys = CATEGORY_FILTER_TABS.map((tab) => tab.key).filter(
  (key): key is CategoryContentKey => Boolean(key)
);

function buildFormFromSources(
  key: CategoryContentKey,
  override: Awaited<ReturnType<typeof categoryHubApi.getOverride>> | null
): CategoryHubOverrideForm {
  const base = getCategoryContent(key);
  if (!base) {
    return {
      category_key: key,
      hero: { eyebrow: '', title: '', subtitle: '' },
      seo: { title: '', description: '' },
      trust_points: [],
      is_published: true,
    };
  }

  const hero = (override?.hero || {}) as Partial<CategoryHubOverrideForm['hero']>;
  const seo = (override?.seo || {}) as Partial<CategoryHubOverrideForm['seo']>;
  const trust = Array.isArray(override?.trust_points)
    ? (override.trust_points as CategoryTrustPoint[])
    : [];

  return {
    category_key: key,
    hero: {
      eyebrow: hero.eyebrow?.trim() || base.hero.eyebrow,
      title: hero.title?.trim() || base.hero.title,
      subtitle: hero.subtitle?.trim() || base.hero.subtitle,
    },
    seo: {
      title: seo.title?.trim() || base.seo.title,
      description: seo.description?.trim() || base.seo.description,
    },
    trust_points:
      trust.length > 0
        ? trust
        : base.trustPoints.map((point) => ({ ...point })),
    is_published: override?.is_published ?? true,
  };
}

export default function AdminCategoryHubs() {
  const [selectedKey, setSelectedKey] = useState<CategoryContentKey>(editableKeys[0]);
  const [form, setForm] = useState<CategoryHubOverrideForm>(() =>
    buildFormFromSources(editableKeys[0], null)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadForm = useCallback(async (key: CategoryContentKey) => {
    if (!isSupabaseConfigured()) {
      setForm(buildFormFromSources(key, null));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const override = await categoryHubApi.getOverride(key, { includeUnpublished: true });
      setForm(buildFormFromSources(key, override));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load category hub CMS data.');
      setForm(buildFormFromSources(key, null));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadForm(selectedKey);
  }, [selectedKey, loadForm]);

  const previewPath = useMemo(
    () => buildProductsCategoryPath(selectedKey),
    [selectedKey]
  );

  const handleSave = async () => {
    setSaving(true);

    if (!isSupabaseConfigured()) {
      toast.error('Supabase is required to save category hub CMS overrides.');
      setSaving(false);
      return;
    }

    try {
      await categoryHubApi.upsertOverride(form);
      toast.success('Category hub saved. Changes appear on the shop page after refresh.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const base = getCategoryContent(selectedKey);
    if (!base) return;
    setForm({
      category_key: selectedKey,
      hero: { ...base.hero },
      seo: { ...base.seo },
      trust_points: base.trustPoints.map((point) => ({ ...point })),
      is_published: true,
    });
    toast.info('Form reset to code registry defaults. Save to persist to CMS.');
  };

  const updateTrustPoint = (index: number, field: keyof CategoryTrustPoint, value: string) => {
    setForm((current) => ({
      ...current,
      trust_points: current.trust_points.map((point, i) =>
        i === index ? { ...point, [field]: value } : point
      ),
    }));
  };

  const addTrustPoint = () => {
    setForm((current) => ({
      ...current,
      trust_points: [...current.trust_points, { label: '', detail: '' }],
    }));
  };

  const removeTrustPoint = (index: number) => {
    setForm((current) => ({
      ...current,
      trust_points: current.trust_points.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Category Hubs</h1>
          <p className="text-charcoal-light text-sm mt-1 max-w-2xl">
            Edit hero copy, SEO, and trust points for enriched shop category pages. Gallery, guides,
            PDFs, and blog cards still use the code registry and Supabase blog mapping.
          </p>
        </div>
        <Link
          to={previewPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-charcoal hover:border-himalayan/40"
        >
          Preview on storefront
          <ExternalLink size={16} />
        </Link>
      </div>

      {!isSupabaseConfigured() && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          Connect Supabase to enable CMS overrides. Storefront uses static registry content only.
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-light px-2 mb-2">
            Shop categories
          </p>
          {editableKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                selectedKey === key
                  ? 'bg-himalayan text-white'
                  : 'bg-gray-50 text-charcoal hover:bg-himalayan-lighter'
              }`}
            >
              {filterLabelFromKey(key)}
            </button>
          ))}
        </aside>

        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-himalayan" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-bold text-charcoal">
                  {filterLabelFromKey(selectedKey)}
                </h2>
                <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_published: event.target.checked }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-himalayan focus:ring-himalayan"
                  />
                  Published on storefront
                </label>
              </div>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
                  Hero
                </h3>
                <label className="block text-sm">
                  <span className="font-medium text-charcoal">Eyebrow</span>
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={form.hero.eyebrow}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        hero: { ...current.hero, eyebrow: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-charcoal">Title</span>
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={form.hero.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        hero: { ...current.hero, title: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-charcoal">Subtitle</span>
                  <textarea
                    className={`${inputClass} mt-1.5 min-h-24 resize-none`}
                    value={form.hero.subtitle}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        hero: { ...current.hero, subtitle: event.target.value },
                      }))
                    }
                  />
                </label>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">SEO</h3>
                <label className="block text-sm">
                  <span className="font-medium text-charcoal">Meta title</span>
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={form.seo.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        seo: { ...current.seo, title: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-charcoal">Meta description</span>
                  <textarea
                    className={`${inputClass} mt-1.5 min-h-24 resize-none`}
                    value={form.seo.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        seo: { ...current.seo, description: event.target.value },
                      }))
                    }
                  />
                </label>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
                    Trust points
                  </h3>
                  <button
                    type="button"
                    onClick={addTrustPoint}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-himalayan"
                  >
                    <Plus size={14} />
                    Add point
                  </button>
                </div>
                {form.trust_points.map((point, index) => (
                  <div
                    key={`trust-${index}`}
                    className="p-4 border border-gray-100 rounded-xl space-y-3 bg-gray-50/50"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-charcoal-light">
                        Point {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTrustPoint(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        aria-label="Remove trust point"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      className={inputClass}
                      placeholder="Label"
                      value={point.label}
                      onChange={(event) => updateTrustPoint(index, 'label', event.target.value)}
                    />
                    <textarea
                      className={`${inputClass} min-h-16 resize-none`}
                      placeholder="Detail"
                      value={point.detail}
                      onChange={(event) => updateTrustPoint(index, 'detail', event.target.value)}
                    />
                  </div>
                ))}
              </section>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  isLoading={saving}
                  leftIcon={<Save size={18} />}
                >
                  Save CMS override
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  leftIcon={<RefreshCw size={16} />}
                >
                  Reset to defaults
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
