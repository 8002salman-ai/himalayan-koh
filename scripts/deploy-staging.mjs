#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CF_ENV_SCRIPT = join(ROOT, '..', '.freebuff', 'cf-env.mjs');

if (!existsSync(CF_ENV_SCRIPT)) {
  console.error('cf-env.mjs script not found at', CF_ENV_SCRIPT);
  process.exit(1);
}

const cfEnvOut = execSync(`node "${CF_ENV_SCRIPT}"`, { encoding: 'utf8' });
const env = { ...process.env };
for (const line of cfEnvOut.split(/\r?\n/)) {
  const m = line.match(/^export\s+([A-Z0-9_]+)=(.*)$/);
  if (m) {
    env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const deployResult = spawnSync('npx', ['vinext-cloudflare', 'deploy', '--config', 'dist/server/wrangler.json'], {
  cwd: ROOT,
  env,
  shell: true,
  stdio: 'inherit',
});

if (deployResult.error) {
  console.error('Spawn error:', deployResult.error);
}

if (deployResult.status !== 0) {
  console.error('Deploy exited with status:', deployResult.status);
  process.exit(deployResult.status ?? 1);
}

const checkSecrets = spawnSync('node', ['scripts/check-build-secrets.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});

process.exit(checkSecrets.status ?? 0);
