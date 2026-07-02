-- Guest checkout: PostgREST insert(...).select() requires SELECT on returned rows.
-- auth.uid() = user_id fails when both are NULL (guest orders).

DROP POLICY IF EXISTS "Anon can view guest orders" ON orders;
CREATE POLICY "Anon can view guest orders"
  ON orders FOR SELECT
  USING (user_id IS NULL);

DROP POLICY IF EXISTS "Anon can view guest order items" ON order_items;
CREATE POLICY "Anon can view guest order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND o.user_id IS NULL
    )
  );
