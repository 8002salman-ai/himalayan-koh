-- 031_restore_products_public_read_policy.sql
--
-- Migration 029 (dealer/wholesale removal) dropped the two products policies
-- that referenced dealer_only / is_approved_dealer:
--   * "Anyone can view active non-dealer-only products"
--   * "Admins and approved dealers can view dealer-only products"
--
-- On fresh databases the original 002 policy "Anyone can view active products"
-- still exists (the deleted 017 never ran), so nothing else was needed there.
-- But databases that had 017 applied ended up with ZERO products policies,
-- which RLS-enforced as "no one can read products" — the storefront went
-- empty. This restores the 002 policy set for those environments. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Anyone can view active products'
  ) THEN
    CREATE POLICY "Anyone can view active products"
      ON public.products FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Admins can manage products'
  ) THEN
    CREATE POLICY "Admins can manage products"
      ON public.products FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;
