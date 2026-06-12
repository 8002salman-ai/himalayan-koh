'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, ExternalLink, Loader2, Save, Settings, XCircle } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { SETTINGS_REGISTRY, type SettingsCategory } from '../../lib/settings/registry';

type SourceMap = Record<string, Record<string, 'db' | 'env' | 'unset'>>;
type ValuesMap = Record<string, Record<string, string>>;

async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

function SourceBadge({ source }: { source: 'db' | 'env' | 'unset' }) {
  if (source === 'db')
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">DB</span>;
  if (source === 'env')
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">ENV</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">unset</span>;
}

function isConfigured(category: SettingsCategory, values: ValuesMap, sources: SourceMap): boolean {
  const firstField = category.fields[0];
  if (!firstField) return false;
  const src = sources[category.id]?.[firstField.key];
  const val = values[category.id]?.[firstField.key];
  return (src === 'db' || src === 'env') && Boolean(val);
}

export default function AdminSettings() {
  const { session } = useAuthContext();
  const [values, setValues] = useState<ValuesMap>({});
  const [sources, setSources] = useState<SourceMap>({});
  const [localEdits, setLocalEdits] = useState<ValuesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/settings', session.access_token);
      setValues(data.settings ?? {});
      setSources(data.sources ?? {});
      const initial: ValuesMap = {};
      for (const cat of SETTINGS_REGISTRY) {
        initial[cat.id] = { ...(data.settings[cat.id] ?? {}) };
      }
      setLocalEdits(initial);
    } catch (err) {
      setError({ global: err instanceof Error ? err.message : 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (categoryId: string, key: string, value: string) => {
    setLocalEdits((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] ?? {}), [key]: value },
    }));
    setSaved(null);
  };

  const handleSave = async (categoryId: string) => {
    if (!session?.access_token) return;
    setSaving(categoryId);
    setError((prev) => ({ ...prev, [categoryId]: '' }));
    try {
      await apiFetch('/api/admin/settings', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ category: categoryId, settings: localEdits[categoryId] ?? {} }),
      });
      setSaved(categoryId);
      await load();
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError((prev) => ({
        ...prev,
        [categoryId]: err instanceof Error ? err.message : 'Save failed.',
      }));
    } finally {
      setSaving(null);
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-himalayan" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-himalayan/10 flex items-center justify-center">
          <Settings size={22} className="text-himalayan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">API Settings</h1>
          <p className="text-sm text-charcoal-light">
            Keys saved here are used first. Env vars (.env.local / Vercel) are the fallback.
          </p>
        </div>
      </div>

      {error.global && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.global}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold mb-1">Supabase keys cannot be set here</p>
        <p>
          <code className="text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{' '}
          <code className="text-xs bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
          must stay in Vercel → Environment Variables (app needs them to start).
        </p>
      </div>

      {SETTINGS_REGISTRY.map((category) => {
        const configured = isConfigured(category, values, sources);
        const open = expanded[category.id] ?? true;
        const isSaving = saving === category.id;
        const justSaved = saved === category.id;
        const catError = error[category.id];

        return (
          <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <button
              type="button"
              onClick={() => toggleExpanded(category.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {configured ? (
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-400 flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className="font-semibold text-charcoal">{category.label}</p>
                  <p className="text-xs text-charcoal-light">{category.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {category.docsHref && (
                  <a
                    href={category.docsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-himalayan flex items-center gap-1 hover:underline"
                  >
                    Docs <ExternalLink size={11} />
                  </a>
                )}
                {open ? <ChevronUp size={18} className="text-charcoal-light" /> : <ChevronDown size={18} className="text-charcoal-light" />}
              </div>
            </button>

            {/* Fields */}
            {open && (
              <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100">
                {category.fields.map((field) => {
                  const src = sources[category.id]?.[field.key] ?? 'unset';
                  const currentVal = localEdits[category.id]?.[field.key] ?? '';

                  return (
                    <div key={field.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-semibold text-charcoal">{field.label}</label>
                        <SourceBadge source={src} />
                      </div>
                      <input
                        type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'}
                        value={currentVal}
                        onChange={(e) => handleChange(category.id, field.key, e.target.value)}
                        placeholder={
                          src === 'env'
                            ? `${field.placeholder} (using env var)`
                            : field.placeholder
                        }
                        autoComplete="off"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan bg-white"
                      />
                      {field.hint && (
                        <p className="text-xs text-charcoal-light mt-1">{field.hint}</p>
                      )}
                    </div>
                  );
                })}

                {catError && (
                  <p className="text-sm text-red-600">{catError}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                  {justSaved ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-700 font-semibold">
                      <CheckCircle size={16} /> Saved successfully
                    </span>
                  ) : (
                    <span className="text-xs text-charcoal-light">
                      Leave a field blank to remove its DB override (env var will be used).
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSave(category.id)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-himalayan hover:bg-himalayan-dark disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Save {category.label.split('—')[0].trim()}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
