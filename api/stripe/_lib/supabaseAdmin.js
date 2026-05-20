import { createClient } from '@supabase/supabase-js';

let adminClient;

/** Service-role Supabase client for server/webhook order updates only. */
export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL on the server.'
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}
