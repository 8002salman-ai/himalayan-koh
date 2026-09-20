const PUBLIC_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

function parseEnvText(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);
    if (match?.[2]) values[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '');
  }
  return values;
}

/**
 * Resolve only browser-public Supabase values from approved files and env.
 * @param {{ processEnv?: Record<string, string | undefined>, fileContents?: string[] }} options
 * @returns {Record<string, string>}
 */
export function resolvePublicSupabaseEnv({ processEnv = {}, fileContents = [] } = {}) {
  const result = {};
  for (const file of fileContents) Object.assign(result, parseEnvText(file));
  for (const key of PUBLIC_KEYS) {
    if (processEnv[key]) result[key] = processEnv[key];
  }
  if (!result.VITE_SUPABASE_URL && result.NEXT_PUBLIC_SUPABASE_URL) {
    result.VITE_SUPABASE_URL = result.NEXT_PUBLIC_SUPABASE_URL;
  }
  if (!result.VITE_SUPABASE_ANON_KEY && result.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    result.VITE_SUPABASE_ANON_KEY = result.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  return result;
}

export function missingPublicSupabaseKeys(config) {
  return ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
    .filter((key) => !config[key] && !(key === 'NEXT_PUBLIC_SUPABASE_URL' ? config.VITE_SUPABASE_URL : config.VITE_SUPABASE_ANON_KEY));
}

export function publicSupabasePresence(config) {
  return {
    url: Boolean(config.NEXT_PUBLIC_SUPABASE_URL || config.VITE_SUPABASE_URL),
    anonKey: Boolean(config.NEXT_PUBLIC_SUPABASE_ANON_KEY || config.VITE_SUPABASE_ANON_KEY),
  };
}

export function requirePublicSupabaseEnv(config) {
  const presence = publicSupabasePresence(config);
  process.stdout.write(`NEXT_PUBLIC_SUPABASE_URL: ${presence.url ? 'PRESENT' : 'MISSING'}\n`);
  process.stdout.write(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${presence.anonKey ? 'PRESENT' : 'MISSING'}\n`);
  const missing = missingPublicSupabaseKeys(config);
  if (missing.length) {
    throw new Error(`Missing required public Supabase configuration: ${missing.join(', ')}`);
  }
  return config;
}
