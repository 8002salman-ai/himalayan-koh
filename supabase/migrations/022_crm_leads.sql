-- =============================================
-- CRM (Phase 1) — Leads inbox + activity log
-- =============================================
-- Unifies inbound leads (contact form submissions and manually-added
-- prospects) into a single admin-managed pipeline with
-- status tracking, assignment, and a per-lead activity timeline.
--
-- Fully additive. Reuses the shared is_admin() service and update_updated_at()
-- trigger function already defined by earlier migrations. Access is restricted
-- to admins only (staff CRM); no customer-facing exposure.

-- =============================================
-- TABLES
-- =============================================

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  source text not null default 'manual'
    check (source in ('contact_form', 'manual', 'other')),
  -- Optional links back to the originating record so we never duplicate data.
  contact_submission_id uuid references public.contact_submissions(id) on delete set null,
  -- Links to an existing account, if this lead is a known customer.
  profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  subject text,
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_leads_status_idx on public.crm_leads(status);
create index if not exists crm_leads_assigned_to_idx on public.crm_leads(assigned_to);
create index if not exists crm_leads_source_idx on public.crm_leads(source);
create index if not exists crm_leads_created_at_idx on public.crm_leads(created_at desc);

create trigger update_crm_leads_updated_at before update on public.crm_leads
  for each row execute function update_updated_at();

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  activity_type text not null default 'note'
    check (activity_type in ('note', 'call', 'email', 'meeting', 'status_change', 'follow_up')),
  body text not null,
  -- Scheduled follow-up date, when activity_type = 'follow_up'.
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists crm_activities_lead_id_idx on public.crm_activities(lead_id);
create index if not exists crm_activities_due_at_idx on public.crm_activities(due_at)
  where due_at is not null and completed = false;

-- =============================================
-- ROW LEVEL SECURITY (admin-only)
-- =============================================

alter table public.crm_leads enable row level security;
alter table public.crm_activities enable row level security;

create policy "Admin full access to crm_leads"
  on public.crm_leads for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Admin full access to crm_activities"
  on public.crm_activities for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =============================================
-- BACKFILL — import existing contact submissions as leads
-- =============================================
-- Idempotent: only inserts submissions that don't already have a linked lead.

insert into public.crm_leads (name, email, phone, source, contact_submission_id, subject, notes, created_at)
select
  cs.name,
  cs.email,
  cs.phone,
  'contact_form',
  cs.id,
  cs.subject,
  cs.message,
  cs.created_at
from public.contact_submissions cs
where not exists (
  select 1 from public.crm_leads l where l.contact_submission_id = cs.id
);
