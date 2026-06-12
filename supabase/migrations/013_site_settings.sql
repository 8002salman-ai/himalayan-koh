-- Site-wide API key and service settings managed from the admin panel.
-- Accessible via service_role only (admin API). RLS denies all other access.
CREATE TABLE IF NOT EXISTS site_settings (
  category   TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (category, key)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- No public or authenticated access — only service_role bypasses RLS.
-- Admin API routes use the service_role Supabase client.
