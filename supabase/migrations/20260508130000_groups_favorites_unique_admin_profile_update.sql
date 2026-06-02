-- groups metadata for bulk admin updates
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS semester int,
  ADD COLUMN IF NOT EXISTS institute_id uuid REFERENCES public.institutes (id) ON DELETE SET NULL;

ALTER TABLE public.favorite_groups
  ADD COLUMN IF NOT EXISTS semester int;

-- dedupe favorites before unique constraint
DELETE FROM public.favorite_groups fg
WHERE fg.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY user_id, group_id ORDER BY created_at ASC NULLS LAST, id ASC) AS rn
    FROM public.favorite_groups
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS favorite_groups_user_group_uidx
  ON public.favorite_groups (user_id, group_id);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.auth_user_is_admin())
WITH CHECK (public.auth_user_is_admin());

NOTIFY pgrst, 'reload schema';
