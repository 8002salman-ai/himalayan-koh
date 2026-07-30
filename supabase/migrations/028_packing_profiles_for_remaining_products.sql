-- 028_packing_profiles_for_remaining_products.sql
--
-- The storefront only lists products that carry a `packing_profile:` tag
-- (see isRealCatalogProduct in src/lib/supabase/api/products.ts). Migration 017
-- gave one to the three salt licks, so those three were the only products
-- visible on /products — the rest of the catalog was hidden.
--
-- A packing profile alone is not enough: buildParcels throws "Shipping weight
-- is missing" at checkout when products.weight is null, so a product listed
-- without a weight would be visible but impossible to buy. This migration sets
-- both together, for every product that still lacks a profile.
--
-- THE DIMENSIONS AND WEIGHTS BELOW ARE ESTIMATES, sized from each product's
-- name and description so the catalog is visible and buyable. Shipping quotes
-- will be approximate until they are replaced with measured values in
-- Admin -> Products -> Shipping. Every value here is a plain number in inches
-- or pounds and safe to edit.
--
-- Idempotent: a product that already has a packing_profile tag is skipped, so
-- re-running this never overwrites values corrected in the admin panel.

-- himalayan-edible-pink-salt-fine — Retail pouch. Four to a box, mixed with other pouches.
UPDATE products
SET weight = 2,
    weight_unit = 'lbs',
    tags = (
      SELECT ARRAY_AGG(DISTINCT tag)
      FROM unnest(
        COALESCE(array_remove(tags, NULL), ARRAY[]::TEXT[])
        || ARRAY['packing_profile:%7B%22productLengthIn%22%3A8%2C%22productWidthIn%22%3A5%2C%22productHeightIn%22%3A2.5%2C%22boxLengthIn%22%3A12%2C%22boxWidthIn%22%3A10%2C%22boxHeightIn%22%3A6%2C%22packagingWeightLbs%22%3A0.4%2C%22unitsPerBox%22%3A4%2C%22maxPackedWeightLbs%22%3A30%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D']
      ) AS tag
    ),
    updated_at = NOW()
WHERE slug = 'himalayan-edible-pink-salt-fine'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
    WHERE tag LIKE 'packing_profile:%'
  );

-- himalayan-pink-salt-16oz-jar — Glass jar — marked fragile. Weight includes the jar, not just the 16 oz of salt.
UPDATE products
SET weight = 1.6,
    weight_unit = 'lbs',
    tags = (
      SELECT ARRAY_AGG(DISTINCT tag)
      FROM unnest(
        COALESCE(array_remove(tags, NULL), ARRAY[]::TEXT[])
        || ARRAY['packing_profile:%7B%22productLengthIn%22%3A3%2C%22productWidthIn%22%3A3%2C%22productHeightIn%22%3A5%2C%22boxLengthIn%22%3A10%2C%22boxWidthIn%22%3A8%2C%22boxHeightIn%22%3A6%2C%22packagingWeightLbs%22%3A0.5%2C%22unitsPerBox%22%3A6%2C%22maxPackedWeightLbs%22%3A25%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Atrue%2C%22stackable%22%3Atrue%7D']
      ) AS tag
    ),
    updated_at = NOW()
WHERE slug = 'himalayan-pink-salt-16oz-jar'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
    WHERE tag LIKE 'packing_profile:%'
  );

-- himalayan-rock-salt-6lbs-pouch — Two 6 lb pouches to a box.
UPDATE products
SET weight = 6,
    weight_unit = 'lbs',
    tags = (
      SELECT ARRAY_AGG(DISTINCT tag)
      FROM unnest(
        COALESCE(array_remove(tags, NULL), ARRAY[]::TEXT[])
        || ARRAY['packing_profile:%7B%22productLengthIn%22%3A12%2C%22productWidthIn%22%3A8%2C%22productHeightIn%22%3A3%2C%22boxLengthIn%22%3A14%2C%22boxWidthIn%22%3A10%2C%22boxHeightIn%22%3A8%2C%22packagingWeightLbs%22%3A0.5%2C%22unitsPerBox%22%3A2%2C%22maxPackedWeightLbs%22%3A30%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D']
      ) AS tag
    ),
    updated_at = NOW()
WHERE slug = 'himalayan-rock-salt-6lbs-pouch'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
    WHERE tag LIKE 'packing_profile:%'
  );

-- himalayan-livestock-salt-45lbs — Heavy sack — ships on its own, not stacked or mixed.
UPDATE products
SET weight = 45,
    weight_unit = 'lbs',
    tags = (
      SELECT ARRAY_AGG(DISTINCT tag)
      FROM unnest(
        COALESCE(array_remove(tags, NULL), ARRAY[]::TEXT[])
        || ARRAY['packing_profile:%7B%22productLengthIn%22%3A24%2C%22productWidthIn%22%3A16%2C%22productHeightIn%22%3A6%2C%22boxLengthIn%22%3A26%2C%22boxWidthIn%22%3A18%2C%22boxHeightIn%22%3A8%2C%22packagingWeightLbs%22%3A1.5%2C%22unitsPerBox%22%3A1%2C%22maxPackedWeightLbs%22%3A70%2C%22shipsSeparately%22%3Atrue%2C%22canMix%22%3Afalse%2C%22fragile%22%3Afalse%2C%22stackable%22%3Afalse%7D']
      ) AS tag
    ),
    updated_at = NOW()
WHERE slug = 'himalayan-livestock-salt-45lbs'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
    WHERE tag LIKE 'packing_profile:%'
  );

-- himalayan-salt-licks-horses — Small lick, two to a box.
UPDATE products
SET weight = 4,
    weight_unit = 'lbs',
    tags = (
      SELECT ARRAY_AGG(DISTINCT tag)
      FROM unnest(
        COALESCE(array_remove(tags, NULL), ARRAY[]::TEXT[])
        || ARRAY['packing_profile:%7B%22productLengthIn%22%3A4%2C%22productWidthIn%22%3A4%2C%22productHeightIn%22%3A4%2C%22boxLengthIn%22%3A10%2C%22boxWidthIn%22%3A10%2C%22boxHeightIn%22%3A6%2C%22packagingWeightLbs%22%3A0.5%2C%22unitsPerBox%22%3A2%2C%22maxPackedWeightLbs%22%3A20%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Atrue%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D']
      ) AS tag
    ),
    updated_at = NOW()
WHERE slug = 'himalayan-salt-licks-horses'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
    WHERE tag LIKE 'packing_profile:%'
  );

-- himalayan-salt-cattle-18lbs — One bag per box.
UPDATE products
SET weight = 18,
    weight_unit = 'lbs',
    tags = (
      SELECT ARRAY_AGG(DISTINCT tag)
      FROM unnest(
        COALESCE(array_remove(tags, NULL), ARRAY[]::TEXT[])
        || ARRAY['packing_profile:%7B%22productLengthIn%22%3A16%2C%22productWidthIn%22%3A12%2C%22productHeightIn%22%3A5%2C%22boxLengthIn%22%3A18%2C%22boxWidthIn%22%3A14%2C%22boxHeightIn%22%3A7%2C%22packagingWeightLbs%22%3A1%2C%22unitsPerBox%22%3A1%2C%22maxPackedWeightLbs%22%3A40%2C%22shipsSeparately%22%3Afalse%2C%22canMix%22%3Afalse%2C%22fragile%22%3Afalse%2C%22stackable%22%3Atrue%7D']
      ) AS tag
    ),
    updated_at = NOW()
WHERE slug = 'himalayan-salt-cattle-18lbs'
  AND NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
    WHERE tag LIKE 'packing_profile:%'
  );

-- Report anything still hidden from the storefront.
DO $$
DECLARE
  hidden INTEGER;
BEGIN
  SELECT COUNT(*) INTO hidden
  FROM products
  WHERE is_active = TRUE
    AND dealer_only = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM unnest(COALESCE(tags, ARRAY[]::TEXT[])) AS tag
      WHERE tag LIKE 'packing_profile:%'
    );

  IF hidden > 0 THEN
    RAISE WARNING
      '% active product(s) still have no packing profile and stay hidden from /products. Add one in Admin -> Products -> Shipping.',
      hidden;
  ELSE
    RAISE NOTICE 'Every active product now has a packing profile and a shipping weight.';
  END IF;
END $$;
