/**
 * Phase 0 milestone verification (no browser deps).
 * Usage: npm run verify:phase0
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function pass(id, label, detail = '') {
  results.push({ id, status: 'PASS', label, detail });
  console.log(`✓ PASS  ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(id, label, detail = '') {
  results.push({ id, status: 'FAIL', label, detail });
  console.log(`✗ FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
}

function warn(id, label, detail = '') {
  results.push({ id, status: 'WARN', label, detail });
  console.log(`! WARN  ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('Phase 0 verification\n');

// P0-A: single-file gate
const viteConfig = readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
if (viteConfig.includes('VITE_SINGLE_FILE') && viteConfig.includes('useSingleFile ?')) {
  pass('p0a-config', 'vite-plugin-singlefile gated behind VITE_SINGLE_FILE');
} else {
  fail('p0a-config', 'vite.config.ts missing single-file gate');
}

try {
  execSync('npx vite build', { cwd: root, stdio: 'pipe', env: { ...process.env, VITE_SINGLE_FILE: '' } });
  const assetsDir = path.join(root, 'dist', 'assets');
  const jsFiles = existsSync(assetsDir)
    ? readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
    : [];
  if (jsFiles.length > 5) {
    pass('p0a-build', 'Production build emits multiple JS chunks', `${jsFiles.length} files`);
  } else {
    fail('p0a-build', 'Expected chunked build output', `${jsFiles.length} js files in dist/assets`);
  }
} catch (err) {
  fail('p0a-build', 'vite build failed', err.stderr?.toString()?.slice(0, 200) || err.message);
}

// P0-B: monitoring + ErrorBoundary wiring
const required = [
  'src/lib/monitoring.ts',
  'src/components/ErrorBoundary.tsx',
  'src/main.tsx',
];
for (const file of required) {
  if (existsSync(path.join(root, file))) {
    pass(`p0b-${file}`, `Exists: ${file}`);
  } else {
    fail(`p0b-${file}`, `Missing: ${file}`);
  }
}
const mainTs = readFileSync(path.join(root, 'src/main.tsx'), 'utf8');
if (mainTs.includes('initMonitoring') && mainTs.includes('ErrorBoundary')) {
  pass('p0b-wire', 'main.tsx wires monitoring + ErrorBoundary');
} else {
  fail('p0b-wire', 'main.tsx missing monitoring or ErrorBoundary');
}

// P0-C: docs + RLS script + logo alt
for (const file of ['DEPLOYMENT.md', '.env.example', 'scripts/verify-rls.mjs']) {
  if (existsSync(path.join(root, file))) {
    pass(`p0c-${file}`, `Exists: ${file}`);
  } else {
    fail(`p0c-${file}`, `Missing: ${file}`);
  }
}

const layout = readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');
if (layout.includes('Himalayan Koh — Salt that Heals') && !layout.includes('â€')) {
  pass('p0c-alt', 'Logo alt text encoding fixed');
} else {
  fail('p0c-alt', 'Logo alt still has encoding issue');
}

try {
  execSync('node scripts/verify-rls.mjs', { cwd: root, stdio: 'pipe' });
  pass('p0c-rls', 'npm run verify:rls');
} catch (err) {
  const msg = err.stderr?.toString() || err.stdout?.toString() || err.message;
  if (/Missing Supabase|Skip:/i.test(msg)) {
    warn('p0c-rls', 'verify:rls skipped (Supabase env not set)');
  } else {
    fail('p0c-rls', 'verify:rls failed', msg.slice(0, 200));
  }
}

const failCount = results.filter((r) => r.status === 'FAIL').length;
const warnCount = results.filter((r) => r.status === 'WARN').length;
const passCount = results.filter((r) => r.status === 'PASS').length;
console.log(`\n--- ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL ---\n`);
process.exit(failCount > 0 ? 1 : 0);
