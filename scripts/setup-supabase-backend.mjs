import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createSeedClients, seedAll } from './seed-demo-accounts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const REQUIRED_ENV_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

// Every migration file this project has, in order. Add new ones here as
// they're created — the _hk_migrations tracking table makes re-running
// this safe (already-applied files are skipped, never re-run).
const MIGRATIONS = [
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
];

function section(title) {
  console.log(`\n— ${title} —`);
}

// =====================================================================
// STEP 1: Environment variables
// =====================================================================
function verifyEnv() {
  section('Step 1/6: Verifying environment variables');
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error('Missing required environment variable(s):');
    for (const name of missing) console.error(`  ✘ ${name}`);
    console.error('\nSet these in .env.local, then re-run: npm run setup');
    process.exit(1);
  }

  for (const name of REQUIRED_ENV_VARS) console.log(`  ✔ ${name}`);
}

// =====================================================================
// STEP 2: Connection test
// =====================================================================
async function verifyConnection() {
  section('Step 2/6: Testing Supabase connection');
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.error(`Connection test failed: ${error.message}`);
    console.error('Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct for this project.');
    process.exit(1);
  }

  console.log(`  ✔ Connected to ${supabaseUrl}`);
  return adminClient;
}

// =====================================================================
// STEPS 3-4: Detect + apply pending migrations (direct Postgres via `pg`,
// using SUPABASE_DB_URL — no Supabase CLI required, though `supabase db
// push` is an equivalent alternative if you have the CLI installed).
// =====================================================================
async function runMigrations() {
  section('Step 3/6: Checking migrations');

  if (!dbUrl) {
    console.warn('  ⚠ SUPABASE_DB_URL is not set — cannot verify or apply migrations automatically.');
    console.warn('    This is a hard limit, not a skipped step: without a direct Postgres connection');
    console.warn('    string (or the Supabase CLI + `supabase db push`), there is no channel this');
    console.warn('    script can use to run schema DDL — the anon/service REST API does not expose');
    console.warn('    arbitrary SQL execution by design.');
    console.warn('    Get it from Supabase Dashboard → Project Settings → Database → Connection string,');
    console.warn('    add it to .env.local as SUPABASE_DB_URL, then re-run npm run setup.');
    console.warn('    Continuing — seeding will fail clearly below if required tables are missing.');
    return { applied: [], skipped: true };
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public._hk_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public._hk_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public._hk_migrations FROM anon, authenticated, PUBLIC;
  `);

  const { rows } = await client.query('SELECT filename FROM public._hk_migrations');
  const alreadyApplied = new Set(rows.map((r) => r.filename));
  const pending = MIGRATIONS.filter((f) => !alreadyApplied.has(f));

  if (pending.length === 0) {
    console.log('  ✔ All migrations already applied — nothing pending.');
  } else {
    console.log(`  Found ${pending.length} pending migration(s): ${pending.join(', ')}`);
    section('Step 4/6: Applying pending migrations');
    for (const filename of pending) {
      const sqlPath = path.join(root, 'supabase', 'migrations', filename);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`  Applying ${filename}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._hk_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`  ✔ Applied ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        await client.end();
        console.error(`  ✘ Migration ${filename} failed: ${error.message}`);
        process.exit(1);
      }
    }
  }

  const seedApplied = await client.query("SELECT 1 FROM public._hk_migrations WHERE filename = 'seed.sql'");
  if (seedApplied.rowCount === 0) {
    console.log('  Seeding demo products, categories, inventory, and blog posts (supabase/seed.sql)...');
    const seedSql = fs.readFileSync(path.join(root, 'supabase', 'seed.sql'), 'utf8');
    await client.query(seedSql);
    await client.query("INSERT INTO public._hk_migrations (filename) VALUES ('seed.sql')");
    console.log('  ✔ Demo products seeded.');
  } else {
    console.log('  ✔ Demo products already seeded — skipping.');
  }

  await client.end();
  return { applied: pending, skipped: false };
}

// =====================================================================
// STEPS 5-12: Demo accounts, dealer data, orders, wishlists,
// notifications, documents, pricing — all via seedAll().
// =====================================================================
async function runSeed() {
  section('Step 5/6: Seeding demo accounts and data');
  const clients = createSeedClients();
  if (!clients) {
    console.error('Could not build Supabase clients for seeding (see missing variables above).');
    process.exit(1);
  }
  return seedAll(clients);
}

// =====================================================================
// MAIN
// =====================================================================
async function run() {
  console.log('Himalayan Koh — one-command environment setup\n');

  verifyEnv();
  await verifyConnection();
  const migrationResult = await runMigrations();
  const seedResult = await runSeed();

  section('Step 6/6: Summary');
  console.log('');
  console.log('✔ Connected to Supabase');
  console.log(
    migrationResult.skipped
      ? '⚠ Migrations Not Verified (no SUPABASE_DB_URL — see warning above)'
      : '✔ Migrations Applied'
  );
  console.log(`✔ Demo Accounts Created (${seedResult.accounts.length})`);
  console.log(`✔ Demo Orders Created (${seedResult.customer.orders + seedResult.dealers.reduce((s, d) => s + d.orders, 0)})`);
  console.log(`✔ Dealer Data Created (${seedResult.dealers.length} dealer account${seedResult.dealers.length === 1 ? '' : 's'})`);
  console.log(`✔ Wishlist Created (${seedResult.customer.wishlist + seedResult.dealers.reduce((s, d) => s + d.wishlist, 0)} items)`);
  console.log(`✔ Notifications Created (${seedResult.customer.notifications + seedResult.dealers.reduce((s, d) => s + d.notifications, 0)})`);
  console.log(`✔ Documents Created (${seedResult.dealers.reduce((s, d) => s + d.documents, 0)})`);
  console.log(`✔ Pricing Seeded (${seedResult.dealers.reduce((s, d) => s + d.pricing, 0)} products)`);

  console.log('\nVerified login details:');
  console.log('');
  console.log('  Admin');
  console.log('    admin@himalayankoh.com / Admin@123');
  console.log('  Manager');
  console.log('    manager@himalayankoh.com / Manager@123');
  console.log('  Sales');
  console.log('    sales@himalayankoh.com / Sales@123');
  console.log('  Customer');
  console.log('    customer@himalayankoh.com / Customer@123');
  console.log('  Dealer (Approved, Gold, Net 30)');
  console.log('    dealer@himalayankoh.com / Dealer@123');
  console.log('');
  console.log(`Project URL: ${supabaseUrl}`);
  console.log('Setup complete. Run `npm run dev` and sign in with any account above.');
}

run().catch((error) => {
  console.error('\nSetup failed:', error.message);
  process.exit(1);
});
