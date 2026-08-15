-- =============================================
-- CRM (Phase 4) — Auto-create leads from inbound sources
-- =============================================
-- Whenever a contact form submission is created, a matching CRM lead is
-- generated automatically so nothing falls through the cracks. Triggers are
-- SECURITY DEFINER so they can write to the admin-only crm_leads table
-- regardless of who triggered the source insert (e.g. an anonymous visitor).

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


