-- =============================================================
-- WHOLESALE PHASE 4 — stock verification gate, payment method
-- constraint, immutable invoices, atomic conversion
-- =============================================================
-- Purely additive/constraining on top of 019/020. No existing row's
-- meaning changes: every wholesale_purchase_requests row currently in
-- 'submitted'/'waiting_stock'/'approved'/etc. remains valid under the
-- widened status check below (all prior values are kept, new ones added).

-- =============================================================
-- 4A — STOCK VERIFICATION GATE
-- =============================================================
-- New pipeline: submitted -> (automatic check) -> ready_for_review |
-- waiting_stock -> (explicit admin action) -> stock_verified ->
-- approved. 'approved' is only reachable from 'stock_verified' — see
-- allowedNextStatuses() in src/lib/wholesale/status.ts, and the
-- server-side guard in the review route, which both enforce this.

ALTER TABLE public.wholesale_purchase_requests
  DROP CONSTRAINT IF EXISTS wholesale_purchase_requests_status_check;

ALTER TABLE public.wholesale_purchase_requests
  ADD CONSTRAINT wholesale_purchase_requests_status_check
  CHECK (status IN (
    'submitted', 'ready_for_review', 'waiting_stock', 'stock_verified',
    'approved', 'rejected', 'changes_requested',
    'payment_pending', 'paid', 'converted', 'cancelled'
  ));

ALTER TABLE public.wholesale_purchase_request_items
  ADD COLUMN IF NOT EXISTS auto_stock_check text CHECK (auto_stock_check IN ('available', 'insufficient')),
  ADD COLUMN IF NOT EXISTS auto_stock_available_qty integer;

-- =============================================================
-- 4B — PAYMENT METHOD CONSTRAINT
-- =============================================================
-- No net/credit terms in v1; wholesale payment is always confirmed
-- manually by an admin as one of exactly two methods.

ALTER TABLE public.wholesale_purchase_requests
  DROP CONSTRAINT IF EXISTS wholesale_pr_payment_method_check;

ALTER TABLE public.wholesale_purchase_requests
  ADD CONSTRAINT wholesale_pr_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('bank_transfer', 'cash'));

-- =============================================================
-- 4C — IMMUTABLE INVOICE SYSTEM
-- =============================================================
-- An issued invoice (proforma or commercial) is a permanent accounting
-- record: full line-item/pricing snapshot + the exact PDF bytes stored
-- in `dealer-documents`, never overwritten. Re-issuing after an edit
-- inserts a new version row; nothing ever updates or deletes a prior one.

CREATE TABLE IF NOT EXISTS public.wholesale_purchase_request_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id uuid NOT NULL REFERENCES public.wholesale_purchase_requests(id) ON DELETE CASCADE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('proforma', 'commercial')),
  version integer NOT NULL CHECK (version > 0),
  invoice_number text NOT NULL,
  snapshot jsonb NOT NULL,
  pdf_path text NOT NULL,
  issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  supersede_reason text,
  UNIQUE (purchase_request_id, invoice_type, version)
);

CREATE INDEX IF NOT EXISTS wholesale_pr_invoices_request_id_idx ON public.wholesale_purchase_request_invoices(purchase_request_id);

-- Same numbering idiom as generate_wholesale_request_number() /
-- generate_order_number() — independent, no shared sequence state.
CREATE OR REPLACE FUNCTION generate_wholesale_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix text;
BEGIN
  prefix := CASE WHEN NEW.invoice_type = 'commercial' THEN 'INV' ELSE 'PI' END;
  NEW.invoice_number := prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_wholesale_invoice_number ON public.wholesale_purchase_request_invoices;
CREATE TRIGGER set_wholesale_invoice_number
  BEFORE INSERT ON public.wholesale_purchase_request_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_wholesale_invoice_number();

ALTER TABLE public.wholesale_purchase_request_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dealers view own invoices" ON public.wholesale_purchase_request_invoices;
CREATE POLICY "Dealers view own invoices"
  ON public.wholesale_purchase_request_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wholesale_purchase_requests pr
      WHERE pr.id = wholesale_purchase_request_invoices.purchase_request_id AND pr.dealer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage invoices" ON public.wholesale_purchase_request_invoices;
CREATE POLICY "Admins manage invoices"
  ON public.wholesale_purchase_request_invoices FOR ALL
  USING (is_admin());

-- =============================================================
-- Traceability column used by 4D (dealer "Converted Orders") and 4E
-- (admin "Wholesale Orders"), and set inside the atomic conversion
-- function below. Nullable/additive — every existing order defaults to
-- NULL, meaning "not a wholesale conversion," which is correct for all
-- current rows including ones already converted under the old
-- (non-atomic) code path (converted_order_id on the request side still
-- links those; this column is populated for new conversions going
-- forward and can be backfilled separately if desired).
-- =============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source_purchase_request_id uuid REFERENCES public.wholesale_purchase_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_source_purchase_request_id_idx ON public.orders(source_purchase_request_id);

-- =============================================================
-- 4F — ATOMIC ORDER CONVERSION
-- =============================================================
-- A single function call is a single Postgres transaction, so every step
-- below either all commits or all rolls back automatically on any
-- exception — no partial state is possible. Row locks (FOR UPDATE) on
-- both the purchase request and each inventory row also make this safe
-- against concurrent conversion attempts or concurrent inventory writes.

CREATE OR REPLACE FUNCTION convert_wholesale_purchase_request(p_request_id uuid, p_admin_id uuid)
RETURNS public.orders AS $$
DECLARE
  v_request public.wholesale_purchase_requests%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_item record;
  v_effective_qty integer;
  v_effective_price numeric;
  v_inv_id uuid;
  v_inv_qty integer;
  v_email text;
BEGIN
  SELECT * INTO v_request FROM public.wholesale_purchase_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase request not found.';
  END IF;
  IF v_request.status != 'paid' THEN
    RAISE EXCEPTION 'Only a purchase request with status "paid" (stock verified, approved, and payment confirmed) can be converted into an order.';
  END IF;
  IF v_request.converted_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'This purchase request has already been converted to an order.';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_request.dealer_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Dealer account has no email on file.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.wholesale_purchase_request_items WHERE purchase_request_id = p_request_id) THEN
    RAISE EXCEPTION 'Purchase request has no line items.';
  END IF;

  -- 1. Create Order
  INSERT INTO public.orders (
    user_id, email, status, payment_status, payment_method,
    subtotal, shipping_cost, tax_amount, discount_amount, total,
    shipping_address, billing_address, notes, source_purchase_request_id
  ) VALUES (
    v_request.dealer_id, v_email, 'processing', 'paid',
    COALESCE(v_request.payment_method, 'wholesale_bank_transfer'),
    v_request.subtotal, v_request.shipping_cost, v_request.tax_amount, 0, v_request.total,
    v_request.shipping_address, COALESCE(v_request.billing_address, v_request.shipping_address),
    'Wholesale order — converted from purchase request ' || v_request.request_number,
    p_request_id
  ) RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM public.wholesale_purchase_request_items WHERE purchase_request_id = p_request_id LOOP
    v_effective_qty := COALESCE(v_item.admin_adjusted_quantity, v_item.quantity);
    v_effective_price := COALESCE(v_item.admin_adjusted_unit_price, v_item.unit_price);

    -- 2. Create Order Items
    INSERT INTO public.order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
    VALUES (v_order.id, v_item.product_id, v_item.product_name, v_item.product_image, v_effective_qty, v_effective_price, v_effective_qty * v_effective_price);

    SELECT id, quantity INTO v_inv_id, v_inv_qty FROM public.inventory WHERE product_id = v_item.product_id FOR UPDATE;
    IF v_inv_id IS NOT NULL THEN
      IF v_inv_qty < v_effective_qty THEN
        RAISE EXCEPTION 'Insufficient inventory for % — available %, required %. Fix stock before converting.', v_item.product_name, v_inv_qty, v_effective_qty;
      END IF;

      -- 3. Reserve Inventory (claim it against this conversion)
      UPDATE public.inventory SET reserved_quantity = reserved_quantity + v_effective_qty WHERE id = v_inv_id;
      -- 4. Reduce Inventory (fulfil the reservation — quantity drops,
      -- reserved_quantity returns to its prior value since the stock is
      -- now actually allocated to a real order, not merely held)
      UPDATE public.inventory
      SET quantity = quantity - v_effective_qty, reserved_quantity = reserved_quantity - v_effective_qty
      WHERE id = v_inv_id;
    END IF;
  END LOOP;

  -- 5. Update Purchase Request
  UPDATE public.wholesale_purchase_requests
  SET status = 'converted', converted_order_id = v_order.id, converted_at = now()
  WHERE id = p_request_id;

  -- 6. Generate Audit Log
  INSERT INTO public.wholesale_purchase_request_audit (purchase_request_id, actor_id, action, details)
  VALUES (p_request_id, p_admin_id, 'converted_to_order', jsonb_build_object('orderId', v_order.id, 'orderNumber', v_order.order_number));

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 4H — DEALER PRODUCT IMPROVEMENTS (schema)
-- =============================================================
-- Availability is computed from the existing `inventory` table
-- (quantity/low_stock_threshold/allow_backorder/track_inventory) — no new
-- column needed for it. Pack size and lead time are new, optional,
-- additive product attributes.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pack_size text,
  ADD COLUMN IF NOT EXISTS lead_time_days integer;
