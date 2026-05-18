-- Sync profile role from auth metadata on signup (admin/customer demo accounts)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
BEGIN
  BEGIN
    requested_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'customer'::user_role
    );
  EXCEPTION
    WHEN others THEN
      requested_role := 'customer'::user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    requested_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
