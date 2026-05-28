import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

const migrations = [
  '001_initial_schema.sql',
  '002_row_level_security.sql',
  '003_storage_buckets.sql',
  '004_auth_profile_roles.sql',
  '005_fix_auth_user_trigger.sql',
  '006_product_images_table.sql',
  '007_category_hub_overrides.sql',
  '008_shippo_shipping.sql',
];

function requireEnv() {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
  if (!dbUrl) missing.push('SUPABASE_DB_URL (or DATABASE_URL)');

  if (missing.length) {
    console.error('Missing required environment variables:\n' + missing.map((v) => `- ${v}`).join('\n'));
    console.error('\nCreate a .env file in the project root. See .env.example');
    process.exit(1);
  }
}

async function run() {
  requireEnv();

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase Postgres.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public._hk_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  for (const filename of migrations) {
    const applied = await client.query(
      'SELECT 1 FROM public._hk_migrations WHERE filename = $1',
      [filename]
    );

    if (applied.rowCount > 0) {
      console.log(`Skip migration (already applied): ${filename}`);
      continue;
    }

    const sqlPath = path.join(root, 'supabase', 'migrations', filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Applying migration: ${filename}`);
    await client.query(sql);
    await client.query(
      'INSERT INTO public._hk_migrations (filename) VALUES ($1)',
      [filename]
    );
    console.log(`Applied: ${filename}`);
  }

  const seedApplied = await client.query(
    "SELECT 1 FROM public._hk_migrations WHERE filename = 'seed.sql'"
  );

  if (seedApplied.rowCount === 0) {
    const seedPath = path.join(root, 'supabase', 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('Seeding demo products, categories, inventory, and blog posts...');
    await client.query(seedSql);
    await client.query(
      "INSERT INTO public._hk_migrations (filename) VALUES ('seed.sql')"
    );
    console.log('Seed data applied.');
  } else {
    console.log('Skip seed (already applied).');
  }

  await client.end();

  console.log('Seeding demo auth accounts...');
  await runNpmScript('seed:demo-accounts');

  console.log('\nSupabase backend initialization complete.');
  console.log(`Project URL: ${supabaseUrl}`);
  console.log('Demo admin: admin@himalayankoh.com / Admin123!');
  console.log('Demo customer: customer@himalayankoh.com / Customer123!');
}

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', scriptName], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

run().catch((error) => {
  console.error('\nSetup failed:', error.message);
  process.exit(1);
});
