-- =============================================
-- SEED DATA FOR HIMALAYAN KOH
-- =============================================

-- Insert Categories (idempotent)
INSERT INTO categories (id, name, slug, description, image_url, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Salt Lick for Horses', 'salt-lick-horses', 'Natural Himalayan salt licks specially designed for horses. Rich in 84 trace minerals.', 'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg', 1),
  ('c1000000-0000-0000-0000-000000000002', 'Salt Lumps for Cattle', 'salt-lumps-cattle', 'Essential minerals in natural salt lumps for cattle health.', 'https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg', 2),
  ('c1000000-0000-0000-0000-000000000003', 'Salt Blocks for Deer', 'salt-blocks-deer', 'Premium salt blocks attract and nourish deer naturally.', 'https://himalayankoh.com/wp-content/uploads/2017/10/slat-licking-horse.jpg', 3),
  ('c1000000-0000-0000-0000-000000000004', 'Edible Cooking Salt', 'edible-cooking-salt', 'Premium pink salt for gourmet cooking and everyday use.', 'https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Insert Products (idempotent)
INSERT INTO products (id, name, slug, description, short_description, price, compare_at_price, category_id, images, thumbnail, is_featured, grain_sizes, tags) VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
    'Himalayan Koh Authentic Pure Natural Halal Unprocessed Himalayan Edible Pink Cooking Salt, Fine Grain (0.5mm to 1mm)',
    'himalayan-edible-pink-salt-fine',
    '100% Natural & Unrefined – No additives, anti-caking agents, or chemicals. Rich in Trace Minerals – Over 80 essential minerals. Kosher & Vegan Friendly. Great for cooking, bath soaks, salt lamps, and more.',
    '100% Natural & Unrefined pink salt with 80+ essential minerals.',
    9.95,
    12.95,
    'c1000000-0000-0000-0000-000000000004',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp'],
    'https://himalayankoh.com/wp-content/uploads/2025/07/6-lbs-pouche.webp',
    true,
    ARRAY['Fine (0.5mm-1mm)', 'Medium (1mm-2mm)', 'Coarse (2mm-5mm)'],
    ARRAY['edible', 'cooking', 'fine grain', 'natural', 'kosher']
  ),
  (
    'p1000000-0000-0000-0000-000000000002',
    'Himalayan Edible Pink Salt – 16 oz Jar',
    'himalayan-pink-salt-16oz-jar',
    'Premium 16 oz jar of pure Himalayan pink salt. Perfect for everyday cooking and table use. Contains 84+ trace minerals.',
    'Premium 16 oz jar for everyday cooking.',
    9.95,
    NULL,
    'c1000000-0000-0000-0000-000000000004',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg'],
    'https://himalayankoh.com/wp-content/uploads/2024/08/WhatsApp-Image-2024-08-02-at-11.31.07-PM-500x500.jpeg',
    false,
    ARRAY['Fine', 'Coarse'],
    ARRAY['edible', 'jar', 'table salt']
  ),
  (
    'p1000000-0000-0000-0000-000000000003',
    'Himalayan Rock Salt Pouches in Fine and Coarse Grain Sizes – 6 lbs',
    'himalayan-rock-salt-6lbs-pouch',
    '6 lbs pouch of premium Himalayan rock salt available in fine and coarse grain sizes. Perfect for families and bulk cooking.',
    '6 lbs pouch available in fine and coarse grain.',
    17.95,
    NULL,
    'c1000000-0000-0000-0000-000000000004',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg'],
    'https://himalayankoh.com/wp-content/uploads/2023/08/S6-600x450.jpg',
    false,
    ARRAY['Fine', 'Coarse'],
    ARRAY['bulk', 'pouch', 'family size']
  ),
  (
    'p1000000-0000-0000-0000-000000000004',
    'Bag of Himalayan Pink Salt for Livestock (45 lbs.)',
    'himalayan-livestock-salt-45lbs',
    '45 lb bag of premium Himalayan pink salt for livestock. Essential minerals for cattle and horses. Long lasting and economical.',
    '45 lb bag for livestock with essential minerals.',
    99.95,
    119.95,
    'c1000000-0000-0000-0000-000000000002',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg'],
    'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
    true,
    ARRAY[],
    ARRAY['bulk', 'livestock', 'cattle', 'horses', '45lbs']
  ),
  (
    'p1000000-0000-0000-0000-000000000005',
    'Himalayan Pink Salt Licks for Horses',
    'himalayan-salt-licks-horses',
    'Natural Himalayan pink salt licks specially designed for horses. Rich in 84 trace minerals. Helps maintain electrolyte balance.',
    'Natural salt licks for horses with 84 minerals.',
    9.95,
    14.95,
    'c1000000-0000-0000-0000-000000000001',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg'],
    'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
    true,
    ARRAY[],
    ARRAY['horses', 'salt lick', 'equine', 'minerals']
  ),
  (
    'p1000000-0000-0000-0000-000000000006',
    'Himalayan Salt Rock for Cattle 18 Lbs Bag',
    'himalayan-salt-cattle-18lbs',
    '18 lb bag of Himalayan salt rocks for cattle. Natural and unprocessed. Perfect size for medium farms.',
    '18 lb bag of natural salt rocks for cattle.',
    49.95,
    NULL,
    'c1000000-0000-0000-0000-000000000002',
    ARRAY['https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg'],
    'https://himalayankoh.com/wp-content/uploads/2020/10/1-600x450.jpeg',
    false,
    ARRAY[],
    ARRAY['cattle', 'salt rock', '18lbs', 'farm']
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  category_id = EXCLUDED.category_id,
  images = EXCLUDED.images,
  thumbnail = EXCLUDED.thumbnail,
  is_featured = EXCLUDED.is_featured,
  grain_sizes = EXCLUDED.grain_sizes,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Insert Inventory for each product (idempotent)
INSERT INTO inventory (product_id, quantity, low_stock_threshold) VALUES
  ('p1000000-0000-0000-0000-000000000001', 500, 50),
  ('p1000000-0000-0000-0000-000000000002', 300, 30),
  ('p1000000-0000-0000-0000-000000000003', 250, 25),
  ('p1000000-0000-0000-0000-000000000004', 100, 10),
  ('p1000000-0000-0000-0000-000000000005', 400, 40),
  ('p1000000-0000-0000-0000-000000000006', 150, 15)
ON CONFLICT (product_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  updated_at = NOW();

-- Insert Blog Posts (idempotent)
INSERT INTO blog_posts (id, title, slug, excerpt, content, featured_image, category, tags, is_published, published_at, read_time) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'Why do dairy cows need trace minerals?',
    'why-dairy-cows-need-trace-minerals',
    'Discover the essential role trace minerals play in dairy cow health, milk production, and overall farm productivity.',
    '<p>Trace minerals are essential nutrients that dairy cows need in small amounts but play crucial roles in their health and productivity...</p><h2>The Importance of Trace Minerals</h2><p>Dairy cows require a balanced diet that includes essential trace minerals like zinc, copper, selenium, and manganese...</p>',
    'https://himalayankoh.com/wp-content/uploads/2017/10/blog9.jpg',
    'Livestock Health',
    ARRAY['dairy', 'cattle', 'minerals', 'health'],
    true,
    NOW() - INTERVAL '5 days',
    5
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'Himalayan Pink Vs. White Salt – Why Farmers Are Switching',
    'himalayan-pink-vs-white-salt-farmers',
    'Learn why more ranchers and farmers are choosing Himalayan pink salt over traditional white salt for their livestock.',
    '<p>For decades, farmers and ranchers have relied on traditional white salt blocks for their livestock. However, a growing number are making the switch to Himalayan pink salt...</p><h2>The Mineral Difference</h2><p>While white salt contains primarily sodium chloride, Himalayan pink salt contains up to 84 trace minerals...</p>',
    'https://himalayankoh.com/wp-content/uploads/2017/10/bowl-of-salt.jpg',
    'Industry Insights',
    ARRAY['comparison', 'farmers', 'pink salt', 'white salt'],
    true,
    NOW() - INTERVAL '12 days',
    7
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'How to Choose the Right Salt Lick for Your Horses',
    'choosing-right-salt-lick-horses',
    'A comprehensive guide to selecting the perfect salt lick for your equine companions.',
    '<p>Horses need salt supplementation to maintain proper health, especially during hot weather or heavy exercise...</p>',
    'https://himalayankoh.com/wp-content/uploads/2021/03/horse-lick-himalayan-salt5-600x450.jpg',
    'Horse Care',
    ARRAY['horses', 'salt lick', 'guide', 'equine'],
    true,
    NOW() - INTERVAL '20 days',
    6
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  featured_image = EXCLUDED.featured_image,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  is_published = EXCLUDED.is_published,
  published_at = EXCLUDED.published_at,
  read_time = EXCLUDED.read_time,
  updated_at = NOW();
