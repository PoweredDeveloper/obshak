-- 42P17 infinite recursion: policies on profiles/admins/... that JOIN profiles
-- re-enter profiles RLS. Use SECURITY DEFINER helper so inner read bypasses RLS.

CREATE OR REPLACE FUNCTION public.auth_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_admin() TO service_role;

-- profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.auth_user_is_admin());

-- admins
DROP POLICY IF EXISTS "Admins can read all admins" ON public.admins;
CREATE POLICY "Admins can read all admins"
ON public.admins
FOR SELECT
TO authenticated
USING (public.auth_user_is_admin());

DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
CREATE POLICY "Admins can insert admins"
ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (public.auth_user_is_admin());

DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
CREATE POLICY "Admins can delete admins"
ON public.admins
FOR DELETE
TO authenticated
USING (public.auth_user_is_admin());

-- bot metrics (only if tables from 20260427091500 exist)
DO $$
BEGIN
  IF to_regclass('public.bot_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins read bot_events" ON public.bot_events;
    CREATE POLICY "Admins read bot_events"
    ON public.bot_events
    FOR SELECT
    TO authenticated
    USING (public.auth_user_is_admin());
  END IF;
  IF to_regclass('public.bot_user_status') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins read bot_user_status" ON public.bot_user_status;
    CREATE POLICY "Admins read bot_user_status"
    ON public.bot_user_status
    FOR SELECT
    TO authenticated
    USING (public.auth_user_is_admin());
  END IF;
END $$;

-- app_settings admin write checks (avoid same recursion on profile reads)
DROP POLICY IF EXISTS "app_settings_admin_insert" ON public.app_settings;
CREATE POLICY "app_settings_admin_insert"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.auth_user_is_admin());

DROP POLICY IF EXISTS "app_settings_admin_update" ON public.app_settings;
CREATE POLICY "app_settings_admin_update"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.auth_user_is_admin())
WITH CHECK (public.auth_user_is_admin());

NOTIFY pgrst, 'reload schema';
