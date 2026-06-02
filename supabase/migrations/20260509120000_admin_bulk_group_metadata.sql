CREATE OR REPLACE FUNCTION public.admin_bulk_set_group_metadata(
  p_group_name text,
  p_institute text,
  p_course int,
  p_semester int,
  p_institute_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_profiles int := 0;
  v_favorites int := 0;
BEGIN
  IF NOT public.auth_user_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_group_name IS NULL OR btrim(p_group_name) = '' THEN
    RAISE EXCEPTION 'group_name required';
  END IF;

  SELECT id INTO v_group_id FROM public.groups WHERE name = p_group_name LIMIT 1;

  IF v_group_id IS NOT NULL THEN
    UPDATE public.groups
    SET
      course = COALESCE(p_course, course),
      semester = COALESCE(p_semester, semester),
      institute_id = COALESCE(p_institute_id, institute_id),
      updated_at = now()
  WHERE id = v_group_id;
  END IF;

  UPDATE public.profiles
  SET
    institute = COALESCE(p_institute, institute),
    course = COALESCE(p_course, course),
    semester = COALESCE(p_semester, semester),
    updated_at = now()
  WHERE group_name = p_group_name
     OR (v_group_id IS NOT NULL AND group_id = v_group_id::text);

  GET DIAGNOSTICS v_profiles = ROW_COUNT;

  IF v_group_id IS NOT NULL THEN
    UPDATE public.favorite_groups
    SET
      institute = COALESCE(p_institute, institute),
      course = COALESCE(p_course, course),
      semester = COALESCE(p_semester, semester)
    WHERE group_id = v_group_id;

    GET DIAGNOSTICS v_favorites = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'group_id', v_group_id,
    'profiles_updated', v_profiles,
    'favorites_updated', v_favorites
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_set_group_metadata(text, text, integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bulk_set_group_metadata(text, text, integer, integer, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
