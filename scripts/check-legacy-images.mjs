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

  // A missing file is not fatal: next.config.ts still serves that path from
  // WordPress via a fallback rewrite. It does mean the site is not yet free of
  // WordPress, which is worth saying loudly on every build until it is fixed.
  if (missing.length > 0) {
    process.stdout.write(
      `WordPress cutover incomplete — ${missing.length} of ${referenced.length} image(s) ` +
        `are still served from himalayankoh.com:\n` +
        missing.map((filename) => `  - ${filename}\n`).join('') +
        `\nRun \`npm run images:fetch\`, commit public/images/legacy/, and delete\n` +
        `LEGACY_IMAGE_FALLBACKS from next.config.ts. The old site cannot be shut\n` +
        `down until then.\n`,
    );
    return;
  }

  process.stdout.write(
    `All ${referenced.length} rehosted images present. ` +
      `LEGACY_IMAGE_FALLBACKS in next.config.ts can be deleted.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
