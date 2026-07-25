/**
 * Sync required env vars from .env.local to Vercel (production + preview + development).
 * Usage: node scripts/sync-vercel-env.mjs
 */
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
dotenv.config({ path: path.join(root, '.env.local') });

// Canonical production domain, confirmed live — see docs/ENV-LOCK.md.
// Several fallbacks elsewhere in this repo (SEO constants, email/Stripe URL
// helpers) assume himalayankoh.com instead; those are only used if
// NEXT_PUBLIC_SITE_URL is ever unset in an environment, which it isn't in
// production. Override by exporting SITE_URL_OVERRIDE if the live domain
// changes.
const productionOverrides = {
  NEXT_PUBLIC_SITE_URL: process.env.SITE_URL_OVERRIDE || 'https://himalayan-koh.vercel.app',
};

const keys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'SHIPPO_API_KEY',
  'NEXT_PUBLIC_SHIPPO_ENABLED',
  'SHIPPO_FROM_NAME',
  'SHIPPO_FROM_STREET1',
  'SHIPPO_FROM_CITY',
  'SHIPPO_FROM_STATE',
  'SHIPPO_FROM_ZIP',
  'SHIPPO_FROM_COUNTRY',
  'SHIPPO_FROM_PHONE',
  'SHIPPO_FROM_EMAIL',
];

const environments = ['production', 'preview', 'development'];

function getValue(key, env) {
  if (env === 'production' && productionOverrides[key]) {
    return productionOverrides[key];
  }
  return process.env[key]?.trim() || '';
}

async function removeEnv(name, env) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['vercel', 'env', 'rm', name, env, '--yes'], {
      cwd: root,
      stdio: 'ignore',
      shell: true,
    });
    child.on('close', () => resolve());
  });
}

async function addEnv(name, value, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vercel', 'env', 'add', name, env], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.stdin.write(value);
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Failed to add ${name} (${env})`));
    });
  });
}

async function main() {
  if (!fs.existsSync(path.join(root, '.env.local'))) {
    console.error('Missing .env.local');
    process.exit(1);
  }

  for (const key of keys) {
    for (const env of environments) {
      const value = getValue(key, env);
      if (!value) {
        console.warn(`Skip ${key} → ${env} (empty in .env.local; Vercel value unchanged)`);
        continue;
      }
      console.log(`Setting ${key} → ${env}`);
      await removeEnv(key, env);
      await addEnv(key, value, env);
    }
  }

  // Site URL for preview/dev can stay localhost for local pulls; production uses live domain.
  for (const env of environments) {
    const siteUrl =
      env === 'production'
        ? productionOverrides.NEXT_PUBLIC_SITE_URL
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    console.log(`Setting NEXT_PUBLIC_SITE_URL → ${env}`);
    await removeEnv('NEXT_PUBLIC_SITE_URL', env);
    await addEnv('NEXT_PUBLIC_SITE_URL', siteUrl, env);
  }

  console.log('\nDone. Redeploy production for changes to take effect:');
  console.log('  npx vercel --prod');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
