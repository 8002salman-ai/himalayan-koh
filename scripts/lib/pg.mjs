import pg from 'pg';
import { getEnvConfig } from './env.mjs';

/** Every migration file this project has, in order. Add new ones here as
 * they're created — the _hk_migrations tracking table (see below) makes
 * every script that uses this list safe to re-run any number of times. */
export const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_row_level_security.sql',
  '003_storage_buckets.sql',
  '004_auth_profile_roles.sql',
  '005_fix_auth_user_trigger.sql',
  '006_product_images_table.sql',
  '007_category_hub_overrides.sql',
  '008_shippo_shipping.sql',
  '009_hk_migrations_rls.sql',
  '010_guest_checkout_select.sql',
  '011_order_tracking_url.sql',
  '012_product_shipping_weights.sql',
  '013_site_settings.sql',
  '014_contact_submissions.sql',
  '015_dealer_program.sql',
  '016_dealer_demo_fields.sql',
  '017_dealer_only_product_rls.sql',
  '018_cart_dealer_isolation.sql',
  '019_wholesale_purchase_requests.sql',
  '020_order_status_packed.sql',
];

/** Tables every script's health/verification checks care about. */
export const REQUIRED_TABLES = [
  'profiles',
  'categories',
  'products',
  'inventory',
  'orders',
  'order_items',
  'wishlists',
  'notifications',
  'dealer_applications',
  'dealer_documents',
  'dealer_notes',
  'dealer_audit_log',
  'dealer_emails',
  'site_settings',
  'contact_submissions',
  'wholesale_purchase_requests',
  'wholesale_purchase_request_items',
  'wholesale_purchase_request_notes',
  'wholesale_purchase_request_audit',
  'wholesale_purchase_request_emails',
  'wholesale_purchase_request_messages',
];

export const REQUIRED_STORAGE_BUCKETS = ['products', 'avatars', 'blog', 'categories', 'dealer-documents'];

export const REQUIRED_EXTENSIONS = ['pgcrypto', 'uuid-ossp'];

/** Connects directly to Postgres via SUPABASE_DB_URL. Returns null if unset. */
export async function connectPg() {
  const { dbUrl } = getEnvConfig();
  if (!dbUrl) return null;
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}

export async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._hk_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public._hk_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public._hk_migrations FROM anon, authenticated, PUBLIC;
  `);
}

export async function getAppliedMigrations(client) {
  const { rows } = await client.query('SELECT filename FROM public._hk_migrations ORDER BY applied_at');
  return rows.map((r) => r.filename);
}

export async function getPendingMigrations(client) {
  const applied = new Set(await getAppliedMigrations(client));
  return MIGRATIONS.filter((f) => !applied.has(f));
}
