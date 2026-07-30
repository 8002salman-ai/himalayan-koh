-- 026_rehost_wordpress_images.sql
--
-- Point every stored image URL at the copies now served from our own domain
-- instead of the old WordPress site. The nine files live in the repo under
-- public/images/legacy/ (see src/lib/images/legacyAssets.ts), so after this runs
-- nothing in the database references himalayankoh.com/wp-content and the old
-- WordPress install can be shut down.
--
-- Idempotent: rows already rehosted no longer match the old URLs, so re-running
-- this migration changes nothing.
--
-- Paths are stored root-relative ('/images/legacy/...') rather than absolute so
-- they resolve correctly on production, preview deployments, and localhost
-- alike.

CREATE TEMP TABLE wp_image_rewrite (old_url TEXT PRIMARY KEY, new_url TEXT NOT NULL) ON COMMIT DROP;

INSERT INTO wp_image_rewrite (old_url, new_url) VALUES
  ('https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg', '/images/legacy/horse-salt-lick-paddock.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg',                 '/images/legacy/horse-licking-salt.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2019/08/horses-1300x200.jpg',                    '/images/legacy/horses-grazing-banner.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg',                              '/images/legacy/cattle-grazing.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',                         '/images/legacy/cattle-salt-bag.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg',                       '/images/legacy/bowl-of-salt.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp',                      '/images/legacy/salt-pouch-6lb.webp'),
  ('https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg', '/images/legacy/pink-salt-16oz-jar.jpg'),
  ('https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg',                         '/images/legacy/salt-rock-bag.jpg');

-- Category hero images.
UPDATE categories c
SET image_url = r.new_url
FROM wp_image_rewrite r
WHERE c.image_url = r.old_url;

-- Product thumbnail (scalar).
UPDATE products p
SET thumbnail = r.new_url
FROM wp_image_rewrite r
WHERE p.thumbnail = r.old_url;

-- Product gallery (array) — rewrite matching elements, preserve order, leave
-- any non-WordPress element untouched.
UPDATE products p
SET images = (
  SELECT ARRAY_AGG(COALESCE(r.new_url, element) ORDER BY ordinality)
  FROM unnest(p.images) WITH ORDINALITY AS gallery(element, ordinality)
  LEFT JOIN wp_image_rewrite r ON r.old_url = gallery.element
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(p.images) AS element
  JOIN wp_image_rewrite r ON r.old_url = element
);

-- Normalized product image rows.
UPDATE product_images pi
SET image_url = r.new_url
FROM wp_image_rewrite r
WHERE pi.image_url = r.old_url;

-- Blog featured images.
UPDATE blog_posts b
SET featured_image = r.new_url
FROM wp_image_rewrite r
WHERE b.featured_image = r.old_url;

-- Historical order line items keep a snapshot of the product image. Rewriting
-- it changes only where the same picture is fetched from, so past orders keep
-- rendering after WordPress goes away.
UPDATE order_items oi
SET product_image = r.new_url
FROM wp_image_rewrite r
WHERE oi.product_image = r.old_url;

-- Report anything still pointing at WordPress. A non-empty result means there
-- is an image URL this migration did not know about — track it down before
-- taking the old site offline.
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM categories WHERE image_url LIKE '%himalayankoh.com/wp-content%')
    + (SELECT COUNT(*) FROM products WHERE thumbnail LIKE '%himalayankoh.com/wp-content%')
    + (SELECT COUNT(*) FROM products WHERE EXISTS (
        SELECT 1 FROM unnest(images) AS element WHERE element LIKE '%himalayankoh.com/wp-content%'))
    + (SELECT COUNT(*) FROM product_images WHERE image_url LIKE '%himalayankoh.com/wp-content%')
    + (SELECT COUNT(*) FROM blog_posts WHERE featured_image LIKE '%himalayankoh.com/wp-content%')
    + (SELECT COUNT(*) FROM order_items WHERE product_image LIKE '%himalayankoh.com/wp-content%')
  INTO remaining;

  IF remaining > 0 THEN
    RAISE WARNING
      'Rehost incomplete: % row(s) still reference himalayankoh.com/wp-content. Add the missing file(s) to src/lib/images/legacyAssets.ts and this migration.',
      remaining;
  ELSE
    RAISE NOTICE 'All image URLs rehosted; no WordPress references remain.';
  END IF;
END $$;
