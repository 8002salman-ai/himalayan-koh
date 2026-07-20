-- ============================================================================
-- FIX: Create CRM tables (crm_leads, crm_activities) + auto-lead triggers.
-- Root cause of "Could not find the table 'public.crm_leads'": migrations
-- 022_crm_leads.sql and 023_crm_auto_leads.sql were never applied to the
-- live database. This file combines both, made fully idempotent.
--
-- Run this ONCE in the Supabase SQL editor (production project).
-- Safe to re-run: every statement guards against "already exists".
-- Requires is_admin() and update_updated_at() (from earlier migrations).
-- ============================================================================

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
    check (source in ('contact_form', 'dealer_application', 'manual', 'other')),
  contact_submission_id uuid references public.contact_submissions(id) on delete set null,
  dealer_application_id uuid references public.dealer_applications(id) on delete set null,
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

drop trigger if exists update_crm_leads_updated_at on public.crm_leads;
create trigger update_crm_leads_updated_at before update on public.crm_leads
  for each row execute function update_updated_at();

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  activity_type text not null default 'note'
    check (activity_type in ('note', 'call', 'email', 'meeting', 'status_change', 'follow_up')),
  body text not null,
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

drop policy if exists "Admin full access to crm_leads" on public.crm_leads;
create policy "Admin full access to crm_leads"
  on public.crm_leads for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "Admin full access to crm_activities" on public.crm_activities;
create policy "Admin full access to crm_activities"
  on public.crm_activities for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =============================================
-- AUTO-LEAD TRIGGERS
-- =============================================

create or replace function public.crm_lead_from_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_leads (
    name, email, phone, source, contact_submission_id, subject, notes, created_at
  )
  values (
    new.name, new.email, new.phone, 'contact_form', new.id, new.subject, new.message, new.created_at
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_crm_lead_from_contact on public.contact_submissions;
create trigger trg_crm_lead_from_contact
  after insert on public.contact_submissions
  for each row execute function public.crm_lead_from_contact();

create or replace function public.crm_lead_from_dealer_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_leads (
    name, email, phone, company, source, dealer_application_id, profile_id, subject, notes, created_at
  )
  values (
    new.owner_name,
    new.business_email,
    new.phone,
    new.business_name,
    'dealer_application',
    new.id,
    new.user_id,
    'Wholesale application: ' || new.business_name,
    new.notes,
    new.created_at
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_crm_lead_from_dealer_application on public.dealer_applications;
create trigger trg_crm_lead_from_dealer_application
  after insert on public.dealer_applications
  for each row execute function public.crm_lead_from_dealer_application();

-- =============================================
-- BACKFILL existing sources (idempotent)
-- =============================================

insert into public.crm_leads (name, email, phone, source, contact_submission_id, subject, notes, created_at)
select cs.name, cs.email, cs.phone, 'contact_form', cs.id, cs.subject, cs.message, cs.created_at
from public.contact_submissions cs
where not exists (select 1 from public.crm_leads l where l.contact_submission_id = cs.id);

insert into public.crm_leads (
  name, email, phone, company, source, dealer_application_id, profile_id, subject, notes, created_at
)
select
  da.owner_name, da.business_email, da.phone, da.business_name,
  'dealer_application', da.id, da.user_id,
  'Wholesale application: ' || da.business_name, da.notes, da.created_at
from public.dealer_applications da
where not exists (select 1 from public.crm_leads l where l.dealer_application_id = da.id);
