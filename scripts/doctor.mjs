import { loadEnv } from './lib/env.mjs';
import {
  checkNodeVersion,
  checkNpmVersion,
  checkEnvVars,
  checkSupabaseConnectivity,
  checkPostgresConnectivity,
  checkRequiredFolders,
  checkMigrations,
  checkStorageBuckets,
  checkRequiredTables,
  checkRlsPolicies,
  checkExtensions,
  checkTypeScript,
  checkBuildStatus,
  formatResult,
} from './lib/checks.mjs';

loadEnv();

console.log('Himalayan Koh — environment health check (read-only, changes nothing)\n');

const checks = [
  checkNodeVersion,
  checkNpmVersion,
  checkEnvVars,
  checkSupabaseConnectivity,
  checkPostgresConnectivity,
  checkRequiredFolders,
  checkMigrations,
  checkStorageBuckets,
  checkRequiredTables,
  checkRlsPolicies,
  checkExtensions,
  checkTypeScript,
  checkBuildStatus,
];

const results = [];
for (const check of checks) {
  const result = await check();
  results.push(result);
  console.log(formatResult(result));
}

const failed = results.filter((r) => r.status === 'fail');
const warned = results.filter((r) => r.status === 'warn');

console.log('\n— Summary —');
console.log(`  ${results.length - failed.length - warned.length} passed, ${warned.length} warning(s), ${failed.length} failed`);

if (failed.length > 0) {
  console.log('\nFAIL — one or more required checks did not pass.');
  process.exit(1);
} else if (warned.length > 0) {
  console.log('\nOK WITH WARNINGS — review the warning(s) above.');
  process.exit(0);
} else {
  console.log('\nAll checks passed — this environment is healthy.');
  process.exit(0);
}
