-- Product-specific shipping and packing configuration.
-- Existing products are intentionally NOT archived automatically here. The
-- migration is safe to apply independently; catalog cleanup remains an explicit
-- admin decision after the new shipping-ready product workflow is verified.
-- The app also stores the profile in an internal product tag, so checkout and
-- label creation work before this optional normalized migration is applied.

create table if not exists public.product_packing_profiles (
  product_id uuid primary key references public.products(id) on delete cascade,
  product_length_in numeric(10,2) not null check (product_length_in > 0),
  product_width_in numeric(10,2) not null check (product_width_in > 0),
  product_height_in numeric(10,2) not null check (product_height_in > 0),
  box_length_in numeric(10,2) not null check (box_length_in > 0),
  box_width_in numeric(10,2) not null check (box_width_in > 0),
  box_height_in numeric(10,2) not null check (box_height_in > 0),
  packaging_weight_lbs numeric(10,2) not null default 0 check (packaging_weight_lbs >= 0),
  units_per_box integer not null default 1 check (units_per_box > 0),
  max_packed_weight_lbs numeric(10,2) not null default 70 check (max_packed_weight_lbs > 0 and max_packed_weight_lbs <= 70),
  ships_separately boolean not null default false,
  can_mix boolean not null default false,
  fragile boolean not null default false,
  stackable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_packing_profiles enable row level security;

drop policy if exists "Admins manage product packing profiles" on public.product_packing_profiles;
create policy "Admins manage product packing profiles"
on public.product_packing_profiles
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create or replace function public.touch_product_packing_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_packing_profiles_updated_at on public.product_packing_profiles;
create trigger product_packing_profiles_updated_at
before update on public.product_packing_profiles
for each row execute function public.touch_product_packing_profile_updated_at();
