-- =============================================
-- CRM (Phase 4) — Auto-create leads from inbound sources
-- =============================================
-- Whenever a contact form submission or a dealer application is created,
-- a matching CRM lead is generated automatically so nothing falls through
-- the cracks. Triggers are SECURITY DEFINER so they can write to the
-- admin-only crm_leads table regardless of who triggered the source insert
-- (anonymous contact form visitor, or an authenticated dealer applicant).

-- ---------------------------------------------
-- Contact form submission -> lead
-- ---------------------------------------------
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

-- ---------------------------------------------
-- Dealer application -> lead
-- ---------------------------------------------
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
    'Dealer application: ' || new.business_name,
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

-- ---------------------------------------------
-- Backfill existing dealer applications (contact submissions were
-- backfilled in migration 022). Idempotent.
-- ---------------------------------------------
insert into public.crm_leads (
  name, email, phone, company, source, dealer_application_id, profile_id, subject, notes, created_at
)
select
  da.owner_name,
  da.business_email,
  da.phone,
  da.business_name,
  'dealer_application',
  da.id,
  da.user_id,
  'Dealer application: ' || da.business_name,
  da.notes,
  da.created_at
from public.dealer_applications da
where not exists (
  select 1 from public.crm_leads l where l.dealer_application_id = da.id
);
