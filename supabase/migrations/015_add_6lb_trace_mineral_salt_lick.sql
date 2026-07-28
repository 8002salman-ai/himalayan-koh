-- Add the verified 6 lb Himalayan salt block shown in the supplied product media.
INSERT INTO products (
  id, name, slug, description, short_description, price, sku, weight, weight_unit,
  category_id, images, thumbnail, is_active, is_featured, grain_sizes, tags,
  meta_title, meta_description
) VALUES (
  'a1d00001-0000-4000-8000-000000000007',
  'Himalayan Salt Block — Essential Trace Minerals, 6 lb',
  'himalayan-6lb-trace-mineral-salt-block',
  'A 6 lb Himalayan salt lick with essential trace minerals. The product label identifies it for horses, cows, goats, deer, sheep, llamas, and other livestock. Ensure animals have access to clean, fresh drinking water. Store in a cool, dry place.',
  '6 lb Himalayan salt lick for horses and livestock with essential trace minerals.',
  40.00, 'HK-BLK-6LB', 6.00, 'lbs',
  'c1a00001-0000-4000-8000-000000000001',
  ARRAY['/images/products/white-background/himalayan-6lb-salt-lick-front-white.png', '/images/products/white-background/himalayan-6lb-salt-lick-side-white.png', '/images/products/white-background/himalayan-6lb-salt-lick-back-white.png'],
  '/images/products/white-background/himalayan-6lb-salt-lick-front-white.png',
  true, true, ARRAY[]::text[],
  ARRAY['livestock', 'horses', 'cattle', 'goats', 'deer', 'sheep', 'llamas', 'salt lick', 'trace minerals', '6lb'],
  '6 lb Himalayan Salt Block with Essential Trace Minerals | Himalayan Koh',
  '6 lb Himalayan salt block for horses and livestock. Essential trace minerals; store in a cool, dry place and provide clean, fresh water.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, short_description = EXCLUDED.short_description,
  price = EXCLUDED.price, sku = EXCLUDED.sku, weight = EXCLUDED.weight, weight_unit = EXCLUDED.weight_unit,
  category_id = EXCLUDED.category_id, images = EXCLUDED.images, thumbnail = EXCLUDED.thumbnail,
  is_active = EXCLUDED.is_active, is_featured = EXCLUDED.is_featured, tags = EXCLUDED.tags,
  meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, updated_at = NOW();

INSERT INTO inventory (product_id, quantity, low_stock_threshold, track_inventory, allow_backorder)
VALUES ('a1d00001-0000-4000-8000-000000000007', 100, 10, true, false)
ON CONFLICT (product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity, low_stock_threshold = EXCLUDED.low_stock_threshold,
  track_inventory = EXCLUDED.track_inventory, allow_backorder = EXCLUDED.allow_backorder, updated_at = NOW();
