#!/usr/bin/env node
/**
 * Fail the build if any rehosted WordPress image referenced in
 * src/lib/images/legacyAssets.ts is missing from public/images/legacy/.
 *
 * Without this, a missing file is invisible until a visitor loads the page and
 * sees a broken image. Run via `npm run build` (prebuild) or on its own:
 *
 *   node scripts/check-legacy-images.mjs
 */

import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_MODULE = join(ROOT, 'src', 'lib', 'images', 'legacyAssets.ts');

async function main() {
  const source = await readFile(ASSET_MODULE, 'utf8');

  // While the cutover switch is off the site still loads these from WordPress,
  // so missing local copies are expected and must not fail the build.
  if (/const SERVE_REHOSTED_COPIES = false/.test(source)) {
    process.stdout.write(
      'Rehosted images not in use yet (SERVE_REHOSTED_COPIES is false) — skipping check.\n' +
        'Run `npm run images:fetch` and flip the switch to finish the WordPress cutover.\n',
    );
    return;
  }

  const referenced = [...source.matchAll(/\$\{LEGACY_DIR\}\/([\w.-]+)/g)].map((match) => match[1]);

  if (referenced.length === 0) {
    process.stderr.write(
      `No image filenames found in ${ASSET_MODULE}. If the file's shape changed, update this check.\n`,
    );
    process.exit(1);
  }

  const missing = [];
  for (const filename of referenced) {
    try {
      await access(join(ROOT, 'public', 'images', 'legacy', filename));
    } catch {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    process.stderr.write(
      `Missing ${missing.length} of ${referenced.length} rehosted image(s) in public/images/legacy/:\n` +
        missing.map((filename) => `  - ${filename}\n`).join('') +
        `\nRun: node scripts/fetch-legacy-images.mjs\n`,
    );
    process.exit(1);
  }

  process.stdout.write(`All ${referenced.length} rehosted images present.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
