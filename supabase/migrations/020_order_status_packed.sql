-- =============================================
-- ADD 'packed' TO order_status (additive, non-breaking)
-- =============================================
-- Wholesale purchase requests convert into a real `orders` row only after
-- stock is approved and payment is confirmed — from that point the existing
-- order lifecycle takes over (processing -> packed -> shipped -> delivered).
-- 'packed' is the one stage missing from the existing enum; every other
-- requested wholesale status (Submitted, Waiting for Stock, Approved,
-- Rejected, Payment Pending, Paid) belongs to
-- wholesale_purchase_requests.status (see 019), not to this enum, and is
-- deliberately not added here.
--
-- ALTER TYPE ... ADD VALUE cannot run in the same transaction as a statement
-- that uses the new value, so this is isolated in its own migration file.

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'packed' AFTER 'processing';
