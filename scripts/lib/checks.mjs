import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { root, missingRequiredVars } from './env.mjs';
import { createClients } from './supabaseClients.mjs';
import {
  connectPg,
  getPendingMigrations,
  REQUIRED_TABLES,
  REQUIRED_STORAGE_BUCKETS,
  REQUIRED_EXTENSIONS,
} from './pg.mjs';

const MIN_NODE_MAJOR = 18;

/** A single check result. status is 'pass' | 'warn' | 'fail'. */
function result(name, status, detail) {
  return { name, status, detail };
}

export function checkNodeVersion() {
  const major = Number(process.version.slice(1).split('.')[0]);
  if (major >= MIN_NODE_MAJOR) {
    return result('Node version', 'pass', `${process.version} (>= ${MIN_NODE_MAJOR} required)`);
  }
  return result('Node version', 'fail', `${process.version} — this project requires Node ${MIN_NODE_MAJOR}+`);
}

export function checkNpmVersion() {
  try {
    const version = execSync('npm --version', { cwd: root }).toString().trim();
    return result('npm version', 'pass', version);
  } catch (error) {
    return result('npm version', 'fail', error.message);
  }
}

export function checkEnvVars() {
  const missing = missingRequiredVars();
  if (missing.length === 0) return result('Environment variables', 'pass', 'all required variables set');
  return result('Environment variables', 'fail', `missing: ${missing.join(', ')}`);
}

export async function checkSupabaseConnectivity() {
  const clients = createClients();
  if (!clients) return result('Supabase connectivity', 'fail', 'clients could not be built — see environment variables check');

  const { error } = await clients.adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) return result('Supabase connectivity', 'fail', error.message);
  return result('Supabase connectivity', 'pass', `connected to ${clients.supabaseUrl}`);
}

export async function checkPostgresConnectivity() {
  let client;
  try {
    client = await connectPg();
    if (!client) return result('PostgreSQL connectivity', 'warn', 'SUPABASE_DB_URL is not set — skipped');
    await client.query('SELECT 1');
    return result('PostgreSQL connectivity', 'pass', 'direct connection succeeded');
  } catch (error) {
    return result('PostgreSQL connectivity', 'fail', error.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

export function checkRequiredFolders() {
  const folders = ['src', 'public', 'scripts', 'supabase/migrations'];
  const missing = folders.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length === 0) return result('Required folders', 'pass', folders.join(', '));
  return result('Required folders', 'fail', `missing: ${missing.join(', ')}`);
}

export async function checkMigrations() {
  let client;
  try {
    client = await connectPg();
    if (!client) return result('Migrations', 'warn', 'SUPABASE_DB_URL not set — cannot verify');
    const pending = await getPendingMigrations(client);
    if (pending.length === 0) return result('Migrations', 'pass', 'all migrations applied');
    return result('Migrations', 'warn', `pending: ${pending.join(', ')}`);
  } catch (error) {
    return result('Migrations', 'fail', error.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

export async function checkStorageBuckets() {
  const clients = createClients();
  if (!clients) return result('Storage buckets', 'fail', 'clients could not be built');

  const { data, error } = await clients.adminClient.storage.listBuckets();
  if (error) return result('Storage buckets', 'fail', error.message);

  const existing = new Set((data || []).map((b) => b.id));
  const missing = REQUIRED_STORAGE_BUCKETS.filter((b) => !existing.has(b));
  if (missing.length === 0) return result('Storage buckets', 'pass', REQUIRED_STORAGE_BUCKETS.join(', '));
  return result('Storage buckets', 'warn', `missing: ${missing.join(', ')} (created by migrations 003 / 015)`);
}

export async function checkRequiredTables() {
  let client;
  try {
    client = await connectPg();
    if (!client) return result('Required tables', 'warn', 'SUPABASE_DB_URL not set — cannot verify');
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const existing = new Set(rows.map((r) => r.table_name));
    const missing = REQUIRED_TABLES.filter((t) => !existing.has(t));
    if (missing.length === 0) return result('Required tables', 'pass', `${REQUIRED_TABLES.length} tables present`);
    return result('Required tables', 'fail', `missing: ${missing.join(', ')}`);
  } catch (error) {
    return result('Required tables', 'fail', error.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

export async function checkRlsPolicies() {
  let client;
  try {
    client = await connectPg();
    if (!client) return result('RLS policies', 'warn', 'SUPABASE_DB_URL not set — cannot verify');

    const { rows } = await client.query(
      `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1)`,
      [REQUIRED_TABLES]
    );
    const withoutRls = rows.filter((r) => !r.rls_enabled).map((r) => r.table_name);
    const found = new Set(rows.map((r) => r.table_name));
    const missingTables = REQUIRED_TABLES.filter((t) => !found.has(t));

    if (missingTables.length > 0) {
      return result('RLS policies', 'warn', `cannot check — tables missing: ${missingTables.join(', ')}`);
    }
    if (withoutRls.length === 0) return result('RLS policies', 'pass', `RLS enabled on all ${rows.length} checked tables`);
    return result('RLS policies', 'fail', `RLS disabled on: ${withoutRls.join(', ')}`);
  } catch (error) {
    return result('RLS policies', 'fail', error.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

export async function checkExtensions() {
  let client;
  try {
    client = await connectPg();
    if (!client) return result('Required extensions', 'warn', 'SUPABASE_DB_URL not set — cannot verify');
    const { rows } = await client.query('SELECT extname FROM pg_extension');
    const existing = new Set(rows.map((r) => r.extname));
    const missing = REQUIRED_EXTENSIONS.filter((e) => !existing.has(e));
    if (missing.length === 0) return result('Required extensions', 'pass', REQUIRED_EXTENSIONS.join(', '));
    return result('Required extensions', 'warn', `missing: ${missing.join(', ')}`);
  } catch (error) {
    return result('Required extensions', 'fail', error.message);
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

export function checkTypeScript() {
  // Spawn node directly against the local TypeScript compiler: npx/npx.cmd
  // shims are unreliable under spawnSync on Windows (ENOENT/EINVAL), while
  // node_modules/typescript/bin/tsc is always present after npm install.
  const tscPath = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const proc = spawnSync(process.execPath, [tscPath, '--noEmit'], { cwd: root, encoding: 'utf8' });
  if (proc.status === 0) return result('TypeScript', 'pass', 'no type errors');
  const errorLines = (proc.stdout || proc.stderr || '').split('\n').filter(Boolean).slice(0, 5);
  return result('TypeScript', 'fail', errorLines.join(' | ') || 'tsc reported errors');
}

/** Non-mutating build check: reports the last build's status without
 * triggering a new one (doctor must not modify anything).
 *
 * Reads the .build-marker written by the postbuild script instead of
 * .next/BUILD_ID: the Next.js dev server rewrites `.next` on every restart
 * (wiping BUILD_ID), which made this check report "no previous build" on dev
 * machines even right after a successful `npm run build`. */
export function checkBuildStatus() {
  const markerPath = path.join(root, '.build-marker');
  if (!fs.existsSync(markerPath)) {
    return result('Build status', 'warn', 'no previous build found — run `npm run build` to verify');
  }
  const stat = fs.statSync(markerPath);
  return result('Build status', 'pass', `last build ${stat.mtime.toISOString()}`);
}

export function formatResult({ name, status, detail }) {
  const icon = status === 'pass' ? '✔' : status === 'warn' ? '⚠' : '✘';
  return `  ${icon} ${name}: ${detail}`;
}
