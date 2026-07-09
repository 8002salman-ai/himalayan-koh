-- =============================================
-- WHOLESALE PURCHASE REQUEST WORKFLOW (B2B Phase 3)
-- =============================================
-- Purchase Requests are a completely separate business entity from Orders
-- and from the Dealer Application program. They are NOT orders (no
-- inventory impact, no payment) until an admin approves stock + confirms
-- payment and converts the request into a real `orders` row.
--
-- Deliberately kept isolated from `dealer_applications`/`dealer_notes`/
-- `dealer_audit_log`/`dealer_emails` (the application/onboarding domain) —
-- those tables are not touched or made nullable. Every logging concern for
-- this workflow (notes, audit, emails, messages) gets its own
-- wholesale_purchase_request_* table so the two business processes never
-- share rows. Shared *services* (is_admin(), is_approved_dealer(),
-- update_updated_at(), sendEmail()) are reused; data is not.

-- =============================================
-- TABLES
-- =============================================

create table if not exists public.wholesale_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  dealer_id uuid not null references auth.users(id) on delete cascade,
  dealer_application_id uuid not null references public.dealer_applications(id) on delete restrict,
  status text not null default 'submitted'
    check (status in (
      'submitted', 'waiting_stock', 'approved', 'rejected', 'changes_requested',
      'payment_pending', 'paid', 'converted', 'cancelled'
    )),
  dealer_po_reference text,
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  shipping_cost numeric(10, 2) not null default 0 check (shipping_cost >= 0),
  tax_amount numeric(10, 2) not null default 0 check (tax_amount >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  currency text not null default 'USD',
  shipping_address jsonb not null,
  billing_address jsonb,
  dealer_notes text,
  rejection_reason text,
  change_request_note text,
  expected_dispatch_date date,
  payment_method text,
  payment_confirmed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  converted_order_id uuid references public.orders(id) on delete set null,
  converted_at timestamptz,
  -- Empty-by-default extensibility hook for future Import/Export/Freight/
  -- Customs/Landed-Cost/ERP modules to attach data without a schema redesign.
  -- Nothing in this phase reads or writes into it.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wholesale_pr_converted_requires_order
    check (status != 'converted' or converted_order_id is not null)
);

create index if not exists wholesale_pr_dealer_id_idx on public.wholesale_purchase_requests(dealer_id);
create index if not exists wholesale_pr_status_idx on public.wholesale_purchase_requests(status);
create index if not exists wholesale_pr_dealer_application_id_idx on public.wholesale_purchase_requests(dealer_application_id);
create index if not exists wholesale_pr_converted_order_id_idx on public.wholesale_purchase_requests(converted_order_id);
create index if not exists wholesale_pr_created_at_idx on public.wholesale_purchase_requests(created_at desc);

create trigger update_wholesale_purchase_requests_updated_at before update on public.wholesale_purchase_requests
  for each row execute function update_updated_at();

-- Request/invoice number generator — same idiom as generate_order_number(),
-- kept as an independent function/trigger so the two numbering schemes never
-- collide or share sequence state. Format: PI-YYYYMMDD-#### (Proforma Invoice).
create or replace function generate_wholesale_request_number()
returns trigger as $$
begin
  new.request_number := 'PI-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad(floor(random() * 10000)::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_wholesale_request_number
  before insert on public.wholesale_purchase_requests
  for each row
  when (new.request_number is null)
  execute function generate_wholesale_request_number();

create table if not exists public.wholesale_purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.wholesale_purchase_requests(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_image text,
  moq_snapshot integer not null default 1,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  admin_adjusted_unit_price numeric(10, 2) check (admin_adjusted_unit_price >= 0),
  admin_adjusted_quantity integer check (admin_adjusted_quantity > 0),
  stock_verified boolean not null default false,
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wholesale_pr_items_request_id_idx on public.wholesale_purchase_request_items(purchase_request_id);
create index if not exists wholesale_pr_items_product_id_idx on public.wholesale_purchase_request_items(product_id);

create trigger update_wholesale_pr_items_updated_at before update on public.wholesale_purchase_request_items
  for each row execute function update_updated_at();

create table if not exists public.wholesale_purchase_request_notes (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.wholesale_purchase_requests(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists wholesale_pr_notes_request_id_idx on public.wholesale_purchase_request_notes(purchase_request_id);

create table if not exists public.wholesale_purchase_request_audit (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.wholesale_purchase_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wholesale_pr_audit_request_id_idx on public.wholesale_purchase_request_audit(purchase_request_id);

create table if not exists public.wholesale_purchase_request_emails (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.wholesale_purchase_requests(id) on delete cascade,
  email_type text not null,
  sent_to text not null,
  subject text not null,
  sent_at timestamptz not null default now()
);

create index if not exists wholesale_pr_emails_request_id_idx on public.wholesale_purchase_request_emails(purchase_request_id);

create table if not exists public.wholesale_purchase_request_messages (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.wholesale_purchase_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('dealer', 'admin')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists wholesale_pr_messages_request_id_idx on public.wholesale_purchase_request_messages(purchase_request_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.wholesale_purchase_requests enable row level security;
alter table public.wholesale_purchase_request_items enable row level security;
alter table public.wholesale_purchase_request_notes enable row level security;
alter table public.wholesale_purchase_request_audit enable row level security;
alter table public.wholesale_purchase_request_emails enable row level security;
alter table public.wholesale_purchase_request_messages enable row level security;

-- wholesale_purchase_requests: dealer can view/insert own; only admin can update
-- (status/pricing/approval changes are admin-only actions in this workflow —
-- a dealer can never edit their own request once submitted).
create policy "Dealers view own purchase requests"
  on public.wholesale_purchase_requests for select
  using (auth.uid() = dealer_id);

create policy "Approved dealers submit purchase requests"
  on public.wholesale_purchase_requests for insert
  with check (auth.uid() = dealer_id and is_approved_dealer());

create policy "Admins manage purchase requests"
  on public.wholesale_purchase_requests for all
  using (is_admin());

-- wholesale_purchase_request_items: readable by the owning dealer (via parent) or admin;
-- only the server-side create path (service role) or admin can write.
create policy "Dealers view own purchase request items"
  on public.wholesale_purchase_request_items for select
  using (
    exists (
      select 1 from public.wholesale_purchase_requests pr
      where pr.id = wholesale_purchase_request_items.purchase_request_id and pr.dealer_id = auth.uid()
    )
  );

create policy "Admins manage purchase request items"
  on public.wholesale_purchase_request_items for all
  using (is_admin());

-- wholesale_purchase_request_notes: internal, admin-only (never visible to dealer)
create policy "Admins manage purchase request notes"
  on public.wholesale_purchase_request_notes for all
  using (is_admin());

-- wholesale_purchase_request_audit: admin reads all; dealer can read their own
-- request's timeline (dashboard "Timeline" requirement); only admin/service
-- role inserts.
create policy "Dealers view own purchase request audit trail"
  on public.wholesale_purchase_request_audit for select
  using (
    exists (
      select 1 from public.wholesale_purchase_requests pr
      where pr.id = wholesale_purchase_request_audit.purchase_request_id and pr.dealer_id = auth.uid()
    )
  );

create policy "Admins manage purchase request audit trail"
  on public.wholesale_purchase_request_audit for all
  using (is_admin());

-- wholesale_purchase_request_emails: admin-only log, mirrors dealer_emails but
-- entirely separate table/domain.
create policy "Admins manage purchase request emails"
  on public.wholesale_purchase_request_emails for all
  using (is_admin());

-- wholesale_purchase_request_messages: dealer (own request) and admin can both
-- read and post — this is the two-way "Messages" thread.
create policy "Dealers view own purchase request messages"
  on public.wholesale_purchase_request_messages for select
  using (
    exists (
      select 1 from public.wholesale_purchase_requests pr
      where pr.id = wholesale_purchase_request_messages.purchase_request_id and pr.dealer_id = auth.uid()
    )
  );

create policy "Dealers send messages on own purchase requests"
  on public.wholesale_purchase_request_messages for insert
  with check (
    sender_id = auth.uid()
    and sender_role = 'dealer'
    and exists (
      select 1 from public.wholesale_purchase_requests pr
      where pr.id = wholesale_purchase_request_messages.purchase_request_id and pr.dealer_id = auth.uid()
    )
  );

create policy "Admins manage purchase request messages"
  on public.wholesale_purchase_request_messages for all
  using (is_admin());

-- Note on inventory: `inventory` already has "Admins can manage inventory"
-- as its only write policy (002_row_level_security.sql) — no dealer/customer
-- session can write to it today. The wholesale conversion service (service
-- role, bypasses RLS) is the only new code path that decrements it, and only
-- at conversion time. No new inventory policy or trigger is needed here.
