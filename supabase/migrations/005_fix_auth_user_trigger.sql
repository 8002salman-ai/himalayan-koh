-- Harden profile creation trigger for Supabase Auth admin user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.user_role;
BEGIN
  BEGIN
    requested_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'customer'::public.user_role
    );
  EXCEPTION
    WHEN others THEN
      requested_role := 'customer'::public.user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    requested_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
