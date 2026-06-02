-- Admin-only RPCs: list/count/search profiles + metrics rows without relying on RLS policy deploy order.
-- SECURITY DEFINER + explicit EXISTS(admin) gate. EXECUTE granted only to authenticated.

CREATE OR REPLACE FUNCTION public.admin_profiles_list(
  p_search text DEFAULT NULL,
  p_group text DEFAULT NULL,
  p_sort text DEFAULT 'activity',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sort_sql text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles cp ON cp.telegram_id = a.telegram_id
    WHERE cp.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_limit < 1 OR p_limit > 500 OR p_offset < 0 THEN
    RAISE EXCEPTION 'invalid pagination' USING ERRCODE = '22023';
  END IF;

  IF p_sort IS NULL OR p_sort NOT IN ('activity', 'name', 'group') THEN
    p_sort := 'activity';
  END IF;

  sort_sql := CASE p_sort
    WHEN 'activity' THEN 'pr.last_active DESC NULLS LAST'
    WHEN 'name' THEN 'pr.first_name ASC NULLS LAST'
    WHEN 'group' THEN 'pr.group_name ASC NULLS LAST'
  END;

  RETURN QUERY EXECUTE format($fmt$
    SELECT pr.*
    FROM public.profiles pr
    WHERE
      ($1 IS NULL OR btrim($1) = '' OR lower(btrim($1)) = 'all' OR pr.group_name = $1)
      AND (
        $2 IS NULL OR btrim($2) = '' OR
        pr.first_name ILIKE '%%' || btrim($2) || '%%' OR
        pr.last_name ILIKE '%%' || btrim($2) || '%%' OR
        pr.username ILIKE '%%' || btrim($2) || '%%' OR
        pr.group_name ILIKE '%%' || btrim($2) || '%%'
      )
    ORDER BY %s
    LIMIT $3 OFFSET $4
  $fmt$, sort_sql)
  USING p_group, p_search, p_limit, p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_profiles_count(
  p_search text DEFAULT NULL,
  p_group text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles cp ON cp.telegram_id = a.telegram_id
    WHERE cp.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::bigint INTO n
  FROM public.profiles pr
  WHERE
    (p_group IS NULL OR btrim(p_group) = '' OR lower(btrim(p_group)) = 'all' OR pr.group_name = p_group)
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      pr.first_name ILIKE '%' || btrim(p_search) || '%' OR
      pr.last_name ILIKE '%' || btrim(p_search) || '%' OR
      pr.username ILIKE '%' || btrim(p_search) || '%' OR
      pr.group_name ILIKE '%' || btrim(p_search) || '%'
    );

  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_profiles_metrics_rows()
RETURNS TABLE (
  institute text,
  group_name text,
  telegram_id bigint,
  created_at timestamptz,
  last_active timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.institute,
    p.group_name,
    p.telegram_id,
    p.created_at,
    p.last_active
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles cp ON cp.telegram_id = a.telegram_id
    WHERE cp.id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_profiles_group_activity()
RETURNS TABLE (
  group_name text,
  last_active timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.group_name, pr.last_active
  FROM public.profiles pr
  WHERE pr.group_name IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.admins a
      INNER JOIN public.profiles cp ON cp.telegram_id = a.telegram_id
      WHERE cp.id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.admin_profiles_list(text, text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_profiles_count(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_profiles_metrics_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_profiles_group_activity() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_profiles_list(text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_profiles_count(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_profiles_metrics_rows() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_profiles_group_activity() TO authenticated;

NOTIFY pgrst, 'reload schema';
