-- =============================================
-- FIX: dealer_only products were readable by anyone via RLS
-- =============================================
-- The "Anyone can view active products" policy (002_row_level_security.sql)
-- only checked is_active, so a dealer_only=true product row was still
-- selectable by an unauthenticated/retail request that bypasses the app's
-- own query-layer filter (e.g. a raw PostgREST call). RLS is the actual
-- security boundary — the app-layer filter alone is not sufficient.
--
-- This replaces that policy so dealer_only rows are only visible to
-- admins and approved dealers, matching the real isolation requirement.

create or replace function is_approved_dealer()
returns boolean as $$
begin
  return exists (
    select 1 from public.dealer_applications
    where user_id = auth.uid() and status = 'approved'
  );
end;
$$ language plpgsql security definer;

drop policy if exists "Anyone can view active products" on public.products;

create policy "Anyone can view active non-dealer-only products"
  on public.products for select
  using (is_active = true and dealer_only = false);

create policy "Admins and approved dealers can view dealer-only products"
  on public.products for select
  using (is_active = true and dealer_only = true and (is_admin() or is_approved_dealer()));
