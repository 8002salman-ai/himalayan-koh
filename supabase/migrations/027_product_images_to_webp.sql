-- 027_product_images_to_webp.sql
--
-- The twelve salt-lick product photos under public/images/products/ were 4 MB
-- PNGs — 24.3 MB in total for six products. They are now WebP (0.98 MB total,
-- same pixel dimensions, transparency preserved). Migrations 015 and 018 wrote
-- the .png paths into product rows, so those rows have to follow.
--
-- Idempotent: only rows still ending in .png match.
--
-- Order of operations: deploy the code (which ships the .webp files) before
-- running this, so every path this migration writes already resolves.

-- Product thumbnail.
UPDATE products
SET thumbnail = regexp_replace(thumbnail, '\.png$', '.webp')
WHERE thumbnail LIKE '/images/products/%.png';

-- Product gallery array — rewrite only local product PNGs, preserve order, and
-- leave Supabase Storage URLs and any other entry untouched.
UPDATE products p
SET images = (
  SELECT ARRAY_AGG(
    CASE
      WHEN gallery.element LIKE '/images/products/%.png'
        THEN regexp_replace(gallery.element, '\.png$', '.webp')
      ELSE gallery.element
    END
    ORDER BY gallery.ordinality
  )
  FROM unnest(p.images) WITH ORDINALITY AS gallery(element, ordinality)
)
WHERE EXISTS (
  SELECT 1 FROM unnest(p.images) AS element WHERE element LIKE '/images/products/%.png'
);

-- Normalized product image rows.
UPDATE product_images
SET image_url = regexp_replace(image_url, '\.png$', '.webp')
WHERE image_url LIKE '/images/products/%.png';

-- Historical order line items keep an image snapshot; same picture, new format.
UPDATE order_items
SET product_image = regexp_replace(product_image, '\.png$', '.webp')
WHERE product_image LIKE '/images/products/%.png';

DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM products WHERE thumbnail LIKE '/images/products/%.png')
    + (SELECT COUNT(*) FROM products WHERE EXISTS (
        SELECT 1 FROM unnest(images) AS element WHERE element LIKE '/images/products/%.png'))
    + (SELECT COUNT(*) FROM product_images WHERE image_url LIKE '/images/products/%.png')
    + (SELECT COUNT(*) FROM order_items WHERE product_image LIKE '/images/products/%.png')
  INTO remaining;

  IF remaining > 0 THEN
    RAISE WARNING 'Still % row(s) pointing at a local product .png.', remaining;
  ELSE
    RAISE NOTICE 'All local product image paths now use .webp.';
  END IF;
END $$;
