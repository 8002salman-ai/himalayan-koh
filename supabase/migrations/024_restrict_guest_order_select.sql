-- Security fix: the blanket "Anon can view guest orders" / "Anon can view
-- guest order items" policies (010_guest_checkout_select.sql) grant SELECT
-- on every guest order (user_id IS NULL) to anyone holding the public anon
-- key — not just the customer who placed a given order. Because RLS can
-- only evaluate row data, not "did this query filter by id", any anon
-- request (e.g. a direct REST call, not just this app's UI) could dump the
-- entire guest orders table.
--
-- Guest order reads now go through server API routes (api/orders/get,
-- api/orders/track) using the service-role client, which enforce the
-- correct scoping themselves (exact order id, or id+email match) instead of
-- relying on RLS to protect a browser-side anon query. Those routes bypass
-- RLS entirely, so this policy is no longer needed for the app to function
-- — dropping it just closes the direct-REST-API enumeration hole.
--
-- Non-destructive: removes an overly broad grant only. No rows, columns, or
-- other policies are touched. Authenticated users' own-order access is
-- unaffected (separate "auth.uid() = user_id" policy, untouched here).
DROP POLICY IF EXISTS "Anon can view guest orders" ON orders;
DROP POLICY IF EXISTS "Anon can view guest order items" ON order_items;
