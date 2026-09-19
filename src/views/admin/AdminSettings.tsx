'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SETTINGS_REGISTRY, type SettingsCategory } from '../../lib/settings/registry';
import {
  fetchIntegrationStatuses,
  testGemini,
  type IntegrationStatus,
} from '../../lib/admin/consoleApi';
import {
  AdminButton,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
} from '../../components/admin/AdminUI';
import { ICON_TILE, ICON_TILE_TONES } from '../../components/admin/adminTheme';

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

/** Where a field's current value comes from — never a value itself. */
function SourceBadge({ source }: { source: 'db' | 'env' | 'unset' }) {
  if (source === 'db') return <AdminChip tone="success">DB</AdminChip>;
  if (source === 'env') return <AdminChip tone="info">ENV</AdminChip>;
  return <AdminChip tone="muted">Unset</AdminChip>;
}

function isConfigured(category: SettingsCategory, values: ValuesMap, sources: SourceMap): boolean {
  const firstField = category.fields[0];
  if (!firstField) return false;
  const src = sources[category.id]?.[firstField.key];
  const val = values[category.id]?.[firstField.key];
  return (src === 'db' || src === 'env') && Boolean(val);
}

/**
 * Settings and API keys — one screen behind both routes.
 *
 * It is the same registry either way, so it stays one view: the console shows
 * which fields exist, where each value is coming from (database override,
 * environment variable, or unset), and writes an override per category. Secret
 * values are typed as passwords, never echoed back, and never displayed as
 * plain text by default.
 */
export default function AdminSettings() {
  const { session } = useAuthContext();
  const toast = useToast();
  const [values, setValues] = useState<ValuesMap>({});
  const [sources, setSources] = useState<SourceMap>({});
  const [localEdits, setLocalEdits] = useState<ValuesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [geminiTest, setGeminiTest] = useState<{ state: string; detail: string } | null>(null);
  const [geminiTesting, setGeminiTesting] = useState(false);

  /**
   * What each integration is doing, as opposed to what is typed into it.
   *
   * The field list below answers "is a value present"; this answers "does the
   * service accept it" and, for Stripe and Shippo, whether the key in place is a
   * TEST one or a LIVE one — the distinction that matters most before a staging
   * run.
   */
  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const { integrations: list } = await fetchIntegrationStatuses(true);
      setIntegrations(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Integration status could not be read.');
      setIntegrations([]);
    } finally {
      setIntegrationsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const runGeminiTest = async () => {
    setGeminiTesting(true);
    try {
      setGeminiTest(await testGemini());
    } catch (err) {
      setGeminiTest({
        state: 'UNREACHABLE',
        detail: err instanceof Error ? err.message : 'The test could not be run.',
      });
    } finally {
      setGeminiTesting(false);
    }
  };

  const load = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
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
      toast.error(err instanceof Error ? err.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, toast]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (categoryId: string, key: string, value: string) => {
    setLocalEdits((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] ?? {}), [key]: value },
    }));
  };

  const handleSave = async (categoryId: string) => {
    if (!session?.access_token) return;
    setSaving(categoryId);
    try {
      await apiFetch('/api/admin/settings', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ category: categoryId, settings: localEdits[categoryId] ?? {} }),
      });
      toast.success('Settings saved successfully.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(null);
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const configuredCount = SETTINGS_REGISTRY.filter((category) =>
    isConfigured(category, values, sources)
  ).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="System"
        title="Settings & API keys"
        description="Keys saved here are used first; environment variables on the deployment are the fallback."
        actions={
          <AdminButton icon={KeyRound} onClick={load} disabled={loading}>
            Reload
          </AdminButton>
        }
      />

      <AdminPanel
        title="Connection status"
        description="What each service is doing right now — never a key value, only whether it is configured, whether it answers, and whether the mode is test or live."
        action={
          <AdminButton icon={Loader2} onClick={loadIntegrations} disabled={integrationsLoading}>
            Re-check
          </AdminButton>
        }
      >
        {integrationsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-admin-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-admin-line px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-admin-ink">
                    {integration.label}
                    {integration.mode && (
                      <AdminChip tone={integration.mode === 'LIVE' ? 'warning' : 'info'}>
                        {integration.mode}
                      </AdminChip>
                    )}
                  </p>
                  <p className="mt-1 text-[13px] text-admin-muted">{integration.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  {integration.source !== 'none' && (
                    <AdminChip tone="neutral">
                      {integration.source === 'console'
                        ? 'Saved in console'
                        : integration.source === 'environment'
                          ? 'Environment'
                          : 'Console + environment'}
                    </AdminChip>
                  )}
                  <AdminChip
                    tone={
                      integration.state === 'CONNECTED'
                        ? 'success'
                        : integration.state === 'INVALID'
                          ? 'danger'
                          : integration.state === 'OWNER ACTION REQUIRED'
                            ? 'warning'
                            : 'muted'
                    }
                  >
                    {integration.state}
                  </AdminChip>
                  {integration.id === 'gemini' && (
                    <AdminButton onClick={runGeminiTest} disabled={geminiTesting}>
                      {geminiTesting ? <Loader2 size={16} className="animate-spin" /> : null}
                      Test connection
                    </AdminButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {geminiTest && (
          <div className="mt-3">
            <AdminNotice
              tone={geminiTest.state === 'CONNECTED' ? 'info' : 'warning'}
              title={`Gemini: ${geminiTest.state}`}
            >
              {geminiTest.detail}
            </AdminNotice>
          </div>
        )}
      </AdminPanel>

      <AdminNotice tone="warning" title="Supabase keys cannot be set from this screen">
        <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
        <code className="rounded bg-amber-100 px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{' '}
        <code className="rounded bg-amber-100 px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> must stay in
        the environment variables of the deployment — the app needs them before any screen, including
        this one, can authenticate.
      </AdminNotice>

      {!session?.access_token && !loading && (
        <AdminNotice tone="warning" title="No admin session">
          Settings are read with the access token of the signed-in administrator, so they cannot be
          shown until that session exists.
        </AdminNotice>
      )}

      {loading ? (
        <AdminPanel title="Integrations" description="Reading current configuration…">
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-admin-canvas" />
            ))}
          </div>
        </AdminPanel>
      ) : (
        <>
          <p className="text-sm text-admin-muted">
            {configuredCount} of {SETTINGS_REGISTRY.length} integrations configured.
          </p>

          {SETTINGS_REGISTRY.map((category) => {
            const configured = isConfigured(category, values, sources);
            const open = expanded[category.id] ?? true;
            const isSaving = saving === category.id;

            return (
              <AdminPanel
                key={category.id}
                title={
                  <button
                    type="button"
                    onClick={() => toggleExpanded(category.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className={`${ICON_TILE} h-7 w-7 ${configured ? ICON_TILE_TONES.green : ICON_TILE_TONES.slate}`}>
                      <KeyRound size={13} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-admin-ink">{category.label}</span>
                      <span className="block text-xs font-normal text-admin-muted">{category.description}</span>
                    </span>
                  </button>
                }
                action={
                  <div className="flex items-center gap-2">
                    <AdminChip tone={configured ? 'success' : 'warning'}>
                      {configured ? 'Configured' : 'Not configured'}
                    </AdminChip>
                    {category.docsHref && (
                      <a
                        href={category.docsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-himalayan hover:underline"
                      >
                        Docs <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(category.id)}
                      className="rounded-lg p-1.5 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                      aria-label={open ? 'Collapse' : 'Expand'}
                    >
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                }
              >
                {open && (
                  <div className="space-y-4">
                    {category.fields.map((field) => {
                      const src = sources[category.id]?.[field.key] ?? 'unset';
                      const currentVal = localEdits[category.id]?.[field.key] ?? '';
                      const revealed = showValues[`${category.id}:${field.key}`];

                      return (
                        <AdminField
                          key={field.key}
                          label={field.label}
                          hint={field.hint}
                          htmlFor={`${category.id}-${field.key}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                              <AdminInput
                                id={`${category.id}-${field.key}`}
                                type={
                                  field.type === 'password'
                                    ? revealed ? 'text' : 'password'
                                    : field.type === 'email' ? 'email' : 'text'
                                }
                                value={currentVal}
                                onChange={(event) => handleChange(category.id, field.key, event.target.value)}
                                placeholder={src === 'env' ? `${field.placeholder} (using env var)` : field.placeholder}
                                autoComplete="off"
                                className={field.type === 'password' ? 'pr-10' : ''}
                              />
                              {field.type === 'password' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowValues((prev) => ({
                                      ...prev,
                                      [`${category.id}:${field.key}`]: !prev[`${category.id}:${field.key}`],
                                    }))
                                  }
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-muted transition-colors hover:text-admin-ink"
                                  aria-label={revealed ? 'Hide value' : 'Show value'}
                                >
                                  {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              )}
                            </div>
                            <SourceBadge source={src} />
                          </div>
                        </AdminField>
                      );
                    })}

                    <div className="flex items-center justify-between border-t border-admin-line pt-4">
                      <span className="text-xs text-admin-muted">
                        Leave a field blank to remove its database override — the environment variable takes over.
                      </span>
                      <AdminButton
                        variant="primary"
                        onClick={() => handleSave(category.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save {category.label.split('—')[0].trim()}
                      </AdminButton>
                    </div>
                  </div>
                )}
              </AdminPanel>
            );
          })}
        </>
      )}
    </>
  );
}
