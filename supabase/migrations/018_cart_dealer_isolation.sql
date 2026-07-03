-- =============================================================
-- DEALER ISOLATION — enforce at the database layer, not just the API
-- =============================================================
-- serverCreateOrder.ts already re-prices every order line from the
-- products table and rejects dealer_only items for non-dealers at
-- order-creation time. This migration adds an independent, defense-in-
-- depth control directly on cart_items so a dealer_only product can
-- never even be added to a retail customer's cart in the first place,
-- regardless of any bug in the application layer.

CREATE OR REPLACE FUNCTION enforce_cart_item_dealer_isolation()
RETURNS TRIGGER AS $$
DECLARE
  product_is_dealer_only BOOLEAN;
BEGIN
  SELECT dealer_only INTO product_is_dealer_only
  FROM public.products
  WHERE id = NEW.product_id;

  IF product_is_dealer_only IS TRUE AND NOT (is_admin() OR is_approved_dealer()) THEN
    RAISE EXCEPTION 'This product is only available to approved dealer accounts.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS cart_items_dealer_isolation ON public.cart_items;
CREATE TRIGGER cart_items_dealer_isolation
  BEFORE INSERT OR UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION enforce_cart_item_dealer_isolation();
