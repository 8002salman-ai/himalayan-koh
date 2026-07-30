/**
 * A large order must become more boxes, never one overweight box.
 *
 * Run: npm run check:packing-splits
 *
 * WHY THIS EXISTS
 *
 * `unitsPerBox` is a MAXIMUM. buildParcels reduces it whenever a full box would
 * break the weight limit, then emits one parcel per box — one parcel is one
 * label, so a bigger order buys more labels rather than a heavier box.
 *
 * The product editor did not agree. It multiplied unitsPerBox by the unit
 * weight and refused to save anything above the limit, reading the field as an
 * exact count. A 30 lb unit with unitsPerBox 3 was rejected for a 90.5 lb box
 * that the packer would never build — it packs two and adds a third parcel.
 *
 * Unlike scripts/check-shippo-packing.mjs, which restates the rules as data,
 * these assertions run the REAL module: the source is compiled with the
 * project's own TypeScript and exercised directly, so the check cannot pass
 * while the shipped behaviour differs.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const outDir = mkdtempSync(join(tmpdir(), 'packing-check-'));
let failures = 0;

const check = (name, fn) => {
  try { fn(); console.log(`  ok    ${name}`); } catch (err) {
    failures++; console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
};

try {
  execFileSync('npx', [
    'tsc', 'src/lib/shippo/packing/buildParcels.ts',
    '--outDir', outDir,
    '--module', 'commonjs', '--target', 'es2020',
    '--esModuleInterop', '--skipLibCheck',
  ], { stdio: 'pipe' });

  const require = createRequire(import.meta.url);
  const { buildParcelsFromPackingLineItems, unitsAllowedByWeight } =
    require(join(outDir, 'packing/buildParcels.js'));

  /** The 30 lb block, with units per box set higher than its weight allows. */
  const heavyProfile = {
    productId: 'block-30lb',
    productLengthIn: 8.5, productWidthIn: 7.5, productHeightIn: 6.5,
    boxLengthIn: 8.5, boxWidthIn: 7.5, boxHeightIn: 6.5,
    packagingWeightLbs: 0.5,
    unitsPerBox: 3,
    maxPackedWeightLbs: 70,
    shipsSeparately: false, canMix: false, fragile: false, stackable: true,
  };

  const parcelsFor = (quantity, profile = heavyProfile, weightLbs = 30) =>
    buildParcelsFromPackingLineItems([
      { quantity, slug: 'block-30lb', name: '30 lb Block', weightLbs, packingProfile: profile },
    ]);

  console.log('\nPacking splits\n');

  check('units per box is capped by weight, not taken as given', () => {
    // 70 limit − 0.5 packaging = 69.5 available; 69.5 / 30 = 2 whole units.
    assert.equal(unitsAllowedByWeight(heavyProfile, 30), 2,
      'taking unitsPerBox literally would build a 90.5 lb box');
  });

  check('a bigger order becomes more parcels, and one parcel is one label', () => {
    assert.equal(parcelsFor(1).length, 1);
    assert.equal(parcelsFor(2).length, 1, 'two units fit one box at 60.5 lb');
    assert.equal(parcelsFor(3).length, 2, 'the third unit needs its own box');
    assert.equal(parcelsFor(5).length, 3);
    assert.equal(parcelsFor(7).length, 4);
  });

  check('no parcel ever exceeds the maximum packed weight', () => {
    for (const quantity of [1, 2, 3, 5, 7, 12, 25]) {
      for (const parcel of parcelsFor(quantity)) {
        assert.ok(parcel.actualWeightLbs <= heavyProfile.maxPackedWeightLbs,
          `qty ${quantity} produced a ${parcel.actualWeightLbs} lb parcel, above `
          + `${heavyProfile.maxPackedWeightLbs} lb`);
      }
    }
  });

  check('every unit ordered is actually shipped', () => {
    for (const quantity of [1, 2, 3, 5, 7, 12, 25]) {
      const shipped = parcelsFor(quantity).reduce(
        (sum, parcel) => sum + (parcel.actualWeightLbs - heavyProfile.packagingWeightLbs), 0);
      // Losing a unit here would under-ship an order that the customer paid for.
      assert.ok(Math.abs(shipped - quantity * 30) < 0.05,
        `qty ${quantity}: parcels carry ${shipped.toFixed(2)} lb of product, expected ${quantity * 30}`);
    }
  });

  check('shipsSeparately forces one unit per box whatever else is set', () => {
    const separate = { ...heavyProfile, shipsSeparately: true, unitsPerBox: 5 };
    assert.equal(unitsAllowedByWeight(separate, 30), 1);
    assert.equal(parcelsFor(4, separate).length, 4);
  });

  check('a unit heavier than its own box limit is refused, not silently split', () => {
    // This is the one genuinely unshippable case, and the only one the product
    // editor should block on.
    const tooHeavy = { ...heavyProfile, maxPackedWeightLbs: 20 };
    assert.throws(() => parcelsFor(1, tooHeavy), /exceeds its maximum packed weight/);
  });

  console.log(
    failures === 0
      ? '\nAll packing-split assertions passed.\n'
      : `\n${failures} assertion group(s) FAILED.\n`,
  );
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
