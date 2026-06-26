create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

create policy "Admin can read contact submissions"
  on public.contact_submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can submit contact form"
  on public.contact_submissions for insert
  to anon, authenticated
  with check (true);
