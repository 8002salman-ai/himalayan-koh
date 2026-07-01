import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from './env.mjs';

/**
 * Builds the admin (service role) + anon Supabase clients used by every
 * dev-toolchain script. Returns null instead of throwing if config is
 * incomplete, so callers can print exactly what's missing.
 */
export function createClients() {
  const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnvConfig();
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return null;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { supabaseUrl, adminClient, anonClient };
}
