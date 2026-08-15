import fs from 'fs';
import path from 'path';
import { loadEnv, root, missingRequiredVars } from './lib/env.mjs';
import { createClients } from './lib/supabaseClients.mjs';
import { connectPg, ensureMigrationsTable, getPendingMigrations, MIGRATIONS } from './lib/pg.mjs';
import { checkRequiredTables, checkRlsPolicies, checkStorageBuckets, formatResult } from './lib/checks.mjs';
import { createSeedClients, seedAll } from './seed-demo-accounts.mjs';

loadEnv();

function section(title) {
  console.log(`\n— ${title} —`);
}

// =====================================================================
// STEP 1: Environment variables
// =====================================================================
function verifyEnv() {
  section('Step 1/7: Verifying environment variables');
  const missing = missingRequiredVars();

  if (missing.length > 0) {
    console.error('Missing required environment variable(s):');
    for (const name of missing) console.error(`  ✘ ${name}`);
    console.error('\nSet these in .env.local, then re-run: npm run setup');
    process.exit(1);
  }

  console.log('  ✔ NEXT_PUBLIC_SUPABASE_URL');
  console.log('  ✔ NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('  ✔ SUPABASE_SERVICE_ROLE_KEY');
}

// =====================================================================
// STEP 2: Connection test
// =====================================================================
async function verifyConnection() {
  section('Step 2/7: Testing Supabase connection');
  const clients = createClients();
  const { error } = await clients.adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.error(`Connection test failed: ${error.message}`);
    console.error('Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct for this project.');
    process.exit(1);
  }
  console.log(`  ✔ Connected to ${clients.supabaseUrl}`);
  return clients;
}

// =====================================================================
// STEPS 3-4: Detect + apply pending migrations, create storage buckets
// and policies (both are part of the migration SQL itself — migrations
// 003 and 015 create the buckets, 002/015/017 create the policies).
// Direct Postgres via `pg` + SUPABASE_DB_URL — no Supabase CLI required,
// though `supabase db push` is an equivalent alternative if preferred.
// =====================================================================
async function runMigrations() {
  section('Step 3/7: Checking migrations');

  const client = await connectPg();
  if (!client) {
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

  await ensureMigrationsTable(client);
  const pending = await getPendingMigrations(client);

  if (pending.length === 0) {
    console.log(`  ✔ All ${MIGRATIONS.length} migrations already applied — nothing pending.`);
  } else {
    console.log(`  Found ${pending.length} pending migration(s): ${pending.join(', ')}`);
    section('Step 4/7: Applying pending migrations (includes storage buckets + RLS policies)');
    for (const filename of pending) {
      const sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', filename), 'utf8');
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
// STEPS 5-6: Demo accounts, orders, wishlists, notifications — all via
// seedAll().
// =====================================================================
async function runSeed() {
  section('Step 5/7: Seeding demo accounts and data');
  const clients = createSeedClients();
  if (!clients) {
    console.error('Could not build Supabase clients for seeding (see missing variables above).');
    process.exit(1);
  }
  return seedAll(clients);
}

// =====================================================================
// STEP 7: Verify completion — re-uses the same checks doctor/verify use,
// so "setup succeeded" is confirmed rather than assumed.
// =====================================================================
async function verifyCompletion() {
  section('Step 6/7: Verifying completion');
  const checks = [checkRequiredTables(), checkStorageBuckets(), checkRlsPolicies()];
  const results = await Promise.all(checks);
  for (const r of results) console.log(formatResult(r));
  const failed = results.filter((r) => r.status === 'fail');
  if (failed.length > 0) {
    console.error('\nSetup completed seeding, but post-setup verification found problems above.');
    process.exit(1);
  }
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
  await verifyCompletion();

  section('Step 7/7: Summary');
  console.log('');
  console.log('✔ Connected to Supabase');
  console.log(
    migrationResult.skipped ? '⚠ Migrations Not Verified (no SUPABASE_DB_URL — see warning above)' : '✔ Migrations Applied'
  );
  console.log('✔ Storage Buckets Created');
  console.log('✔ Policies Created');
  console.log(`✔ Demo Accounts Created (${seedResult.accounts.length})`);
  console.log(`✔ Demo Orders Created (${seedResult.customer.orders})`);
  console.log(`✔ Wishlist Created (${seedResult.customer.wishlist} items)`);
  console.log(`✔ Notifications Created (${seedResult.customer.notifications})`);
  console.log('✔ Setup Verified');

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
  console.log('');
  console.log('Setup complete. Run `npm run dev` and sign in with any account above.');
  console.log('Run `npm run verify` any time to re-check that every workflow still works.');
}

run().catch((error) => {
  console.error('\nSetup failed:', error.message);
  process.exit(1);
});
