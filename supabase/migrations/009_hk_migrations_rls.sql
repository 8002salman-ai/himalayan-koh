-- Lock down internal migration tracker (setup script only; not for client apps)
ALTER TABLE public._hk_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public._hk_migrations FROM anon, authenticated;
REVOKE ALL ON TABLE public._hk_migrations FROM PUBLIC;

-- No RLS policies: authenticated/anon cannot read; service_role bypasses RLS for scripts.
