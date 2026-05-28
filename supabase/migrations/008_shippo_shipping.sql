-- Shippo shipping metadata on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shippo_rate_id TEXT,
  ADD COLUMN IF NOT EXISTS shippo_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service TEXT,
  ADD COLUMN IF NOT EXISTS label_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shippo_transaction ON orders(shippo_transaction_id)
  WHERE shippo_transaction_id IS NOT NULL;
