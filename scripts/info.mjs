import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadEnv, root, getEnvConfig } from './lib/env.mjs';
import { connectPg, ensureMigrationsTable, getAppliedMigrations, MIGRATIONS } from './lib/pg.mjs';
import { SEED_VERSION } from './seed-demo-accounts.mjs';

loadEnv();

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown (not a git checkout)';
  }
}

function gitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function buildTime() {
  const buildIdPath = path.join(root, '.next', 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) return 'not built yet (run `npm run build`)';
  return fs.statSync(buildIdPath).mtime.toISOString();
}

function supabaseProjectRef(supabaseUrl) {
  if (!supabaseUrl) return 'not configured';
  const match = supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : supabaseUrl;
}

async function schemaInfo() {
  let client;
  try {
    client = await connectPg();
  } catch (error) {
    return { schemaVersion: `unknown (could not reach database: ${error.message || error})`, latestMigration: 'unknown' };
  }
  if (!client) {
    return { schemaVersion: 'unknown (SUPABASE_DB_URL not set)', latestMigration: MIGRATIONS[MIGRATIONS.length - 1] };
  }
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const latestApplied = applied.filter((f) => f !== 'seed.sql').sort().pop();
    return {
      schemaVersion: `${applied.filter((f) => f !== 'seed.sql').length}/${MIGRATIONS.length} migrations applied`,
      latestMigration: latestApplied || 'none applied yet',
    };
  } catch (error) {
    return { schemaVersion: `unknown (query failed: ${error.message || error})`, latestMigration: 'unknown' };
  } finally {
    await client.end().catch(() => {});
  }
}

async function run() {
  console.log('Himalayan Koh — project info\n');

  const pkg = readJson('package.json');
  const { supabaseUrl } = getEnvConfig();
  const { schemaVersion, latestMigration } = await schemaInfo();

  const rows = [
    ['Project Version', pkg.version],
    ['Schema Version', schemaVersion],
    ['Latest Migration', latestMigration],
    ['Supabase Project', supabaseProjectRef(supabaseUrl)],
    ['Seed Version', SEED_VERSION],
    ['Git Commit', `${gitCommit()} (${gitBranch()})`],
    ['Build Time', buildTime()],
    ['Environment', process.env.NODE_ENV || 'development'],
  ];

  const width = Math.max(...rows.map(([label]) => label.length));
  for (const [label, value] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value}`);
  }
}

run().catch((error) => {
  console.error('\ninfo failed:', error.message);
  process.exit(1);
});
