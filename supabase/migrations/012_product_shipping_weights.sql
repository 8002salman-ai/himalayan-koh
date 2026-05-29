-- Backfill shipping weights for existing catalog listings (safe, idempotent).
-- Keeps products active; admin should confirm weights in Product editor.

UPDATE products
SET weight = 2, weight_unit = 'lbs', updated_at = NOW()
WHERE slug = 'himalayan-salt-licks-horses' AND (weight IS NULL OR weight <= 0);

UPDATE products
SET weight = 1, weight_unit = 'lbs', updated_at = NOW()
WHERE slug = 'himalayan-pink-salt-16oz-jar' AND (weight IS NULL OR weight <= 0);

UPDATE products
SET weight = 6, weight_unit = 'lbs', updated_at = NOW()
WHERE slug = 'himalayan-rock-salt-6lbs-pouch' AND (weight IS NULL OR weight <= 0);

UPDATE products
SET weight = 6, weight_unit = 'lbs', updated_at = NOW()
WHERE slug = 'himalayan-edible-pink-salt-fine' AND (weight IS NULL OR weight <= 0);

UPDATE products
SET weight = 45, weight_unit = 'lbs', updated_at = NOW()
WHERE slug = 'himalayan-livestock-salt-45lbs' AND (weight IS NULL OR weight <= 0);

UPDATE products
SET weight = 18, weight_unit = 'lbs', updated_at = NOW()
WHERE slug = 'himalayan-salt-cattle-18lbs' AND (weight IS NULL OR weight <= 0);
