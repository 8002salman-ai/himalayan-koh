-- =============================================================
-- 032 - Fix privilege escalation on signup + harden is_admin()
-- =============================================================
--
-- PROBLEM: handle_new_user() copied raw_user_meta_data->>'role' straight into
-- profiles.role. raw_user_meta_data is fully attacker-controlled - anyone with
-- the public anon key can call supabase.auth.signUp() with
-- options.data.role = 'admin' and the trigger would mint a profile with
-- role='admin', which is_admin() then honors for every admin RLS policy. That
-- is a critical, unauthenticated privilege-escalation path.
--
-- FIX: new profiles are ALWAYS created as 'customer'. The only legitimate
-- admin-granting path is the seed script, which writes profiles.role directly
-- with the service-role key (see scripts/seed-demo-accounts.mjs), so honoring
-- metadata here is unnecessary. The conflict branch deliberately no longer
-- touches `role`, so a metadata change can never downgrade an existing admin
-- (or re-escalate anyone) after the row already exists.
--
-- Also hardens is_admin() with `SET search_path = public` (SECURITY DEFINER
-- functions must pin their search path so an attacker cannot substitute a
-- lookalike `profiles` relation from another schema).
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Recreate the admin check with a pinned search path. Same SQL semantics as
-- before, just immune to search_path substitution.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.user_role
  );
$$;
