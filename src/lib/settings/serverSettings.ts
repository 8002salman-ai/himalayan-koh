import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000; // 1 minute

function cacheKey(category: string, key: string) {
  return `${category}::${key}`;
}

export async function getSetting(category: string, key: string): Promise<string | null> {
  const k = cacheKey(category, key);
  const hit = cache.get(k);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('category', category)
      .eq('key', key)
      .maybeSingle();

    const value = (data as { value?: string | null } | null)?.value ?? null;
    cache.set(k, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  } catch {
    return null;
  }
}

export async function getSettingsForCategory(
  category: string,
): Promise<Record<string, string | null>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('category', category);

    const result: Record<string, string | null> = {};
    for (const row of (data ?? []) as { key: string; value: string | null }[]) {
      result[row.key] = row.value;
      cache.set(cacheKey(category, row.key), {
        value: row.value,
        expiresAt: Date.now() + TTL_MS,
      });
    }
    return result;
  } catch {
    return {};
  }
}

export async function upsertSettings(
  category: string,
  settings: Record<string, string | null>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const rows = Object.entries(settings).map(([key, value]) => ({
    category,
    key,
    value: value || null,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  await supabase
    .from('site_settings')
    .upsert(rows, { onConflict: 'category,key' });

  for (const { key } of rows) {
    cache.delete(cacheKey(category, key));
  }
}

export function invalidateCategory(category: string): void {
  for (const k of cache.keys()) {
    if (k.startsWith(`${category}::`)) cache.delete(k);
  }
}
