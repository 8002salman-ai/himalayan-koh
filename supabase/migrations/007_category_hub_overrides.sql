-- CMS overrides for /products?category=... education hubs (hero, SEO, trust — gallery/guides stay in code registry).

CREATE TABLE IF NOT EXISTS category_hub_overrides (
  category_key TEXT PRIMARY KEY CHECK (
    category_key IN (
      'edible-cooking-salt',
      'salt-lick-horses',
      'salt-cattle',
      'salt-blocks-deer'
    )
  ),
  hero JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  trust_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_hub_overrides_published
  ON category_hub_overrides (is_published)
  WHERE is_published = true;

ALTER TABLE category_hub_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published category hub overrides" ON category_hub_overrides;
CREATE POLICY "Anyone can view published category hub overrides"
  ON category_hub_overrides FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage category hub overrides" ON category_hub_overrides;
CREATE POLICY "Admins can manage category hub overrides"
  ON category_hub_overrides FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS update_category_hub_overrides_updated_at ON category_hub_overrides;
CREATE TRIGGER update_category_hub_overrides_updated_at
  BEFORE UPDATE ON category_hub_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Optional starter rows (empty JSON = use code registry defaults until admin saves).
INSERT INTO category_hub_overrides (category_key, is_published)
VALUES
  ('edible-cooking-salt', true),
  ('salt-lick-horses', true),
  ('salt-cattle', true),
  ('salt-blocks-deer', true)
ON CONFLICT (category_key) DO NOTHING;
