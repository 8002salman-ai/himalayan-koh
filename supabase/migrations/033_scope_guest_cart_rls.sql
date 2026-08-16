-- =============================================================
-- 033 - Scope guest cart access to the caller's session
-- =============================================================
--
-- PROBLEM: the original cart/cart_items policies granted access to any row
-- whose cart had `session_id IS NOT NULL` - i.e. EVERY guest cart, to ANY
-- caller (anon or authenticated). Anyone with the public anon key could list
-- and mutate every guest cart on the site: cart-stuffing another shopper's
-- cart, deleting their items, or re-assigning carts. The server re-prices all
-- line items at order time so this was never a money leak, but it was a real
-- cross-user data-integrity hole.
--
-- FIX: guest carts are now scoped to a session token the client sends as the
-- `x-cart-session` request header (see src/lib/supabase/api/cart.ts). A caller
-- can only see/touch a guest cart whose session_id matches that header; owned
-- carts remain scoped to auth.uid(). Service-role code (serverCreateOrder)
-- bypasses RLS and is unaffected.
-- =============================================================

DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can create cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage cart items" ON public.cart_items;

-- The caller's guest-cart session token, read from the request headers
-- PostgREST exposes to RLS. Returns NULL when the header is absent.
CREATE OR REPLACE FUNCTION public.guest_cart_session()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('request.headers', true)::json->>'x-cart-session', '');
$$;

-- A cart is "owned" by the caller when it is their authenticated cart, or a
-- guest cart whose session token matches the request header.
CREATE OR REPLACE FUNCTION public.cart_owned_by_caller(cart_user_id uuid, cart_session_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (auth.uid() IS NOT NULL AND cart_user_id = auth.uid())
    OR (cart_user_id IS NULL AND cart_session_id IS NOT NULL AND cart_session_id = public.guest_cart_session());
$$;

-- ---- carts -----------------------------------------------------------------

CREATE POLICY "carts_select_own" ON public.carts FOR SELECT
  USING (public.cart_owned_by_caller(user_id, session_id));

CREATE POLICY "carts_insert_own" ON public.carts FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL)
    OR (user_id IS NULL AND session_id = public.guest_cart_session())
  );

CREATE POLICY "carts_update_own" ON public.carts FOR UPDATE
  USING (public.cart_owned_by_caller(user_id, session_id))
  WITH CHECK (public.cart_owned_by_caller(user_id, session_id));

CREATE POLICY "carts_delete_own" ON public.carts FOR DELETE
  USING (public.cart_owned_by_caller(user_id, session_id));

-- ---- cart_items ------------------------------------------------------------

CREATE POLICY "cart_items_select_own" ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND public.cart_owned_by_caller(c.user_id, c.session_id)
    )
  );

CREATE POLICY "cart_items_modify_own" ON public.cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND public.cart_owned_by_caller(c.user_id, c.session_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND public.cart_owned_by_caller(c.user_id, c.session_id)
    )
  );
