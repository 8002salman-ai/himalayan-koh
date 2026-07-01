-- =============================================
-- DEALER PROGRAM — additional fields for demo/testing support
-- =============================================
-- tax_exempt: dealer-level tax exemption flag shown on the dealer profile.
-- credit_limit: nominal credit ceiling for the "Available Credit" dashboard
-- stat (available credit = credit_limit - outstanding unpaid order totals).

alter table public.dealer_applications
  add column if not exists tax_exempt boolean not null default false,
  add column if not exists credit_limit numeric;
