-- =============================================================
-- 035 - Let customers cancel their own pending orders
-- =============================================================
--
-- ordersApi.cancelOrder() existed but could never succeed: the only UPDATE
-- policy on orders was "Admins can manage orders", so a customer's direct
-- update was silently filtered out by RLS. The "Cancel Order" button in the
-- account area was therefore left un-wired. This adds a narrowly-scoped policy
-- so a customer may update ONLY their own order, ONLY when it is currently
-- pending, and ONLY to move it to cancelled.
-- =============================================================

DROP POLICY IF EXISTS "Users can cancel own pending orders" ON public.orders;

CREATE POLICY "Users can cancel own pending orders" ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending'::public.order_status)
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled'::public.order_status);
