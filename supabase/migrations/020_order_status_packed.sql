-- =============================================
-- ADD 'packed' TO order_status (additive, non-breaking)
-- =============================================
-- Adds the one packing stage missing from the existing order lifecycle
-- (processing -> packed -> shipped -> delivered) so the packing workflow
-- has a distinct progress-bar position between processing and shipped.
--
-- ALTER TYPE ... ADD VALUE cannot run in the same transaction as a statement
-- that uses the new value, so this is isolated in its own migration file.

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'packed' AFTER 'processing';
