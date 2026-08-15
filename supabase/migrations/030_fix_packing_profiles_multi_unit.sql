-- 030_fix_packing_profiles_multi_unit.sql
--
-- The product_packing_profiles rows for the retail catalog were created with
-- units_per_box left at the column default of 1, so every ordered unit was
-- packed (and billed) as its own box — 6 jars -> 6 labels, 20 pouches -> 20
-- labels. The designed multi-unit packing (catalog rules in
-- src/lib/shippo/packing/rules.ts) allows several units per box:
--   * 16 oz jar:        6 per box (10x8x6)
--   * 3 lb pouch:       6 per box (10x10x6)
--   * 6 lb pouch:       2 per box (14x10x8)
--   * 1-2 lb salt lick: 6 per box (10x10x6)
--   * 5-6 lb salt lick: 4 per box (9.5x9.5x5.5)
--   * 30 lb block:      1 per box (kept)
--
-- The matching packing_profile: product tags were corrected at the same time
-- (the admin editor writes both sources). Idempotent — keyed by product slug.

UPDATE public.product_packing_profiles ppp
SET units_per_box         = v.units,
    box_length_in         = v.bl,
    box_width_in          = v.bw,
    box_height_in         = v.bh,
    max_packed_weight_lbs = v.max_w,
    updated_at            = NOW()
FROM (
  VALUES
    ('himalayan-pink-edible-salt-fine-grain-16-oz-jar',  6, 10, 8, 6, 25),
    ('himalayan-pink-edible-salt-fine-grain-pouch-3-lb',  6, 10, 10, 6, 25),
    ('himalayan-pink-edible-salt-fine-grain-pouch-6-lb',  2, 14, 10, 8, 30),
    ('himalayan-salt-lick-1-2-lb',                         6, 10, 10, 6, 20),
    ('himalayan-salt-lick-5-6-lb',                         4, 9.5, 9.5, 5.5, 30)
) AS v(slug, units, bl, bw, bh, max_w)
JOIN public.products p ON p.slug = v.slug
WHERE ppp.product_id = p.id;
