-- Allow clients to check admin status without SELECT on public.admins (RLS-safe).
CREATE OR REPLACE FUNCTION public.is_admin(user_telegram_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.telegram_id = user_telegram_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(bigint) TO service_role;

-- Refresh PostgREST schema cache (local / self-hosted; ignored if not supported)
NOTIFY pgrst, 'reload schema';
