-- Round rope Himalayan salt licks verified by the supplied product media.
INSERT INTO products (
  id, name, slug, description, short_description, price, sku, weight, weight_unit,
  category_id, images, thumbnail, is_active, is_featured, grain_sizes, tags,
  meta_title, meta_description
) VALUES
  ('a1d00001-0000-4000-8000-000000000008', 'Himalayan Round Rope Salt Lick — Essential Trace Minerals, 2 lb', 'himalayan-2lb-round-rope-salt-lick', 'A 2 lb round Himalayan salt lick with rope and essential trace minerals. The product label identifies Himalayan salt licks for horses, cows, goats, deer, sheep, llamas, and other livestock. Ensure animals have access to clean, fresh drinking water. Store in a cool, dry place.', '2 lb round Himalayan rope salt lick with essential trace minerals.', 40.00, 'HK-RL-2LB', 2.00, 'lbs', 'c1a00001-0000-4000-8000-000000000001', ARRAY['/images/products/himalayan-round-rope-salt-lick-front.png', '/images/products/himalayan-round-rope-salt-lick-angle.png', '/images/products/himalayan-round-rope-salt-lick-top.png'], '/images/products/himalayan-round-rope-salt-lick-front.png', true, true, ARRAY[]::text[], ARRAY['livestock', 'horses', 'cattle', 'goats', 'deer', 'sheep', 'llamas', 'salt lick', 'rope lick', '2lb'], '2 lb Himalayan Round Rope Salt Lick | Himalayan Koh', '2 lb Himalayan round rope salt lick with essential trace minerals for horses and livestock. Provide clean, fresh water.'),
  ('a1d00001-0000-4000-8000-000000000009', 'Himalayan Round Rope Salt Lick — Essential Trace Minerals, 6 lb', 'himalayan-6lb-round-rope-salt-lick', 'A 6 lb round Himalayan salt lick with rope and essential trace minerals. The product label identifies Himalayan salt licks for horses, cows, goats, deer, sheep, llamas, and other livestock. Ensure animals have access to clean, fresh drinking water. Store in a cool, dry place.', '6 lb round Himalayan rope salt lick with essential trace minerals.', 40.00, 'HK-RL-6LB', 6.00, 'lbs', 'c1a00001-0000-4000-8000-000000000001', ARRAY['/images/products/himalayan-round-rope-salt-lick-front.png', '/images/products/himalayan-round-rope-salt-lick-angle.png', '/images/products/himalayan-round-rope-salt-lick-top.png'], '/images/products/himalayan-round-rope-salt-lick-front.png', true, true, ARRAY[]::text[], ARRAY['livestock', 'horses', 'cattle', 'goats', 'deer', 'sheep', 'llamas', 'salt lick', 'rope lick', '6lb'], '6 lb Himalayan Round Rope Salt Lick | Himalayan Koh', '6 lb Himalayan round rope salt lick with essential trace minerals for horses and livestock. Provide clean, fresh water.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, short_description = EXCLUDED.short_description,
  price = EXCLUDED.price, sku = EXCLUDED.sku, weight = EXCLUDED.weight, weight_unit = EXCLUDED.weight_unit,
  category_id = EXCLUDED.category_id, images = EXCLUDED.images, thumbnail = EXCLUDED.thumbnail,
  is_active = EXCLUDED.is_active, is_featured = EXCLUDED.is_featured, tags = EXCLUDED.tags,
  meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, updated_at = NOW();

INSERT INTO inventory (product_id, quantity, low_stock_threshold, track_inventory, allow_backorder)
VALUES
  ('a1d00001-0000-4000-8000-000000000008', 100, 10, true, false),
  ('a1d00001-0000-4000-8000-000000000009', 100, 10, true, false)
ON CONFLICT (product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity, low_stock_threshold = EXCLUDED.low_stock_threshold,
  track_inventory = EXCLUDED.track_inventory, allow_backorder = EXCLUDED.allow_backorder, updated_at = NOW();
