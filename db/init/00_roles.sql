-- PostgREST role model (replaces Supabase anon/authenticated/service_role)
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE USER authenticator WITH PASSWORD 'authenticator_pass' NOINHERIT;
  END IF;
END $$;

GRANT anon, authenticated TO authenticator;

-- auth.uid() for PostgREST JWT (claim sub = profile id)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(btrim(current_setting('request.jwt.claim.sub', true)), '')::uuid;
$$;

COMMENT ON FUNCTION auth.uid() IS 'PostgREST passes JWT sub claim; used by RLS policies';
