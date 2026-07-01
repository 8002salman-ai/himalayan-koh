import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

let loaded = false;

/** Loads .env.local then .env, exactly once per process. */
export function loadEnv() {
  if (loaded) return;
  dotenv.config({ path: path.join(root, '.env.local') });
  dotenv.config({ path: path.join(root, '.env') });
  loaded = true;
}

/** Resolved config, accepting the legacy Vite-era var names as fallbacks. */
export function getEnvConfig() {
  loadEnv();
  return {
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    dbUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  };
}

/** Names (from REQUIRED_ENV_VARS) that are not set. Empty array = all present. */
export function missingRequiredVars() {
  loadEnv();
  return REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
}
