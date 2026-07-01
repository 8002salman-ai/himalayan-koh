-- =============================================
-- DEALER PROGRAM (B2B)
-- =============================================
-- Adds dealer application/approval workflow, document storage, pricing
-- extensions, and admin review tooling. Kept fully additive and isolated
-- from the existing customer/admin auth model: a "dealer" is any
-- authenticated user (regular profiles.role stays 'customer'/'admin')
-- who has an approved row in dealer_applications.

-- =============================================
-- TABLES
-- =============================================

create table if not exists public.dealer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  business_email text not null,
  phone text not null,
  website text,
  business_type text not null,
  years_in_business integer,
  country text not null,
  state text not null,
  city text not null,
  zip text not null,
  address text not null,
  monthly_purchase text,
  products_interested text[] not null default '{}',
  sales_channels text[] not null default '{}',
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'need_more_info', 'approved', 'rejected', 'suspended')),
  status_reason text,
  dealer_level text not null default 'bronze'
    check (dealer_level in ('bronze', 'silver', 'gold', 'platinum')),
  credit_terms integer not null default 0,
  sales_rep_id uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists dealer_applications_status_idx on public.dealer_applications(status);
create index if not exists dealer_applications_user_id_idx on public.dealer_applications(user_id);

create trigger update_dealer_applications_updated_at before update on public.dealer_applications
  for each row execute function update_updated_at();

create table if not exists public.dealer_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.dealer_applications(id) on delete cascade,
  document_type text not null
    check (document_type in ('reseller_permit', 'business_license', 'tax_certificate', 'additional')),
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size integer,
  is_verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists dealer_documents_application_id_idx on public.dealer_documents(application_id);

create table if not exists public.dealer_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.dealer_applications(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists dealer_notes_application_id_idx on public.dealer_notes(application_id);

create table if not exists public.dealer_audit_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.dealer_applications(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dealer_audit_log_application_id_idx on public.dealer_audit_log(application_id);

create table if not exists public.dealer_emails (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.dealer_applications(id) on delete cascade,
  email_type text not null,
  sent_to text not null,
  subject text not null,
  sent_at timestamptz not null default now()
);

create index if not exists dealer_emails_application_id_idx on public.dealer_emails(application_id);

-- =============================================
-- PRODUCT PRICING EXTENSIONS
-- =============================================

alter table public.products
  add column if not exists dealer_price numeric,
  add column if not exists distributor_price numeric,
  add column if not exists moq integer not null default 1,
  add column if not exists dealer_only boolean not null default false,
  add column if not exists retail_only boolean not null default false;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table public.dealer_applications enable row level security;
alter table public.dealer_documents enable row level security;
alter table public.dealer_notes enable row level security;
alter table public.dealer_audit_log enable row level security;
alter table public.dealer_emails enable row level security;

-- dealer_applications: owner can read/insert own; only admins can update/manage
create policy "Dealers view own application"
  on public.dealer_applications for select
  using (auth.uid() = user_id);

create policy "Dealers submit own application"
  on public.dealer_applications for insert
  with check (auth.uid() = user_id);

-- Dealers may only edit non-approval-sensitive contact fields on their own
-- row (enforced at the application layer — RLS only restricts row access).
create policy "Dealers update own contact info"
  on public.dealer_applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins manage dealer applications"
  on public.dealer_applications for all
  using (is_admin());

-- dealer_documents: owner can read/insert own (via application ownership); admins manage all
create policy "Dealers view own documents"
  on public.dealer_documents for select
  using (
    exists (
      select 1 from public.dealer_applications da
      where da.id = dealer_documents.application_id and da.user_id = auth.uid()
    )
  );

create policy "Dealers upload own documents"
  on public.dealer_documents for insert
  with check (
    exists (
      select 1 from public.dealer_applications da
      where da.id = dealer_documents.application_id and da.user_id = auth.uid()
    )
  );

create policy "Admins manage dealer documents"
  on public.dealer_documents for all
  using (is_admin());

-- dealer_notes: internal, admin-only
create policy "Admins manage dealer notes"
  on public.dealer_notes for all
  using (is_admin());

-- dealer_audit_log: admins read all; applicant + admin can insert (applicant only for their own submission event)
create policy "Admins view dealer audit log"
  on public.dealer_audit_log for select
  using (is_admin());

create policy "Applicants and admins can log dealer audit events"
  on public.dealer_audit_log for insert
  with check (
    is_admin()
    or exists (
      select 1 from public.dealer_applications da
      where da.id = dealer_audit_log.application_id and da.user_id = auth.uid()
    )
  );

-- dealer_emails: admin-only
create policy "Admins manage dealer emails"
  on public.dealer_emails for all
  using (is_admin());

-- =============================================
-- STORAGE BUCKET
-- =============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dealer-documents', 'dealer-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "Dealers upload own document files"
  on storage.objects for insert
  with check (
    bucket_id = 'dealer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Dealers view own document files"
  on storage.objects for select
  using (
    bucket_id = 'dealer-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_admin()
    )
  );

create policy "Admins manage dealer document files"
  on storage.objects for all
  using (bucket_id = 'dealer-documents' and is_admin());
