-- Public carrier tracking page URL from Shippo (tracking_url_provider)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;
