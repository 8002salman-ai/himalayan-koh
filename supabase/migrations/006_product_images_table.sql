-- Normalized product image metadata while preserving products.images for storefront compatibility.
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_thumbnail BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_images_thumbnail ON product_images(product_id, is_thumbnail);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active product images" ON product_images;
CREATE POLICY "Anyone can view active product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM products
      WHERE products.id = product_images.product_id
        AND products.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

INSERT INTO product_images (product_id, image_url, sort_order, is_thumbnail)
SELECT
  products.id,
  image_item.image_url,
  image_item.ordinality - 1,
  image_item.image_url = COALESCE(products.thumbnail, image_item.image_url)
FROM products
CROSS JOIN LATERAL unnest(products.images) WITH ORDINALITY AS image_item(image_url, ordinality)
WHERE image_item.image_url IS NOT NULL
ON CONFLICT (product_id, image_url) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_thumbnail = EXCLUDED.is_thumbnail,
  updated_at = NOW();
