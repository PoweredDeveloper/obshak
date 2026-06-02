-- teachers_with_ratings was a passthrough of teachers; aggregates stayed stale without trigger.
-- Read ratings_count / average_rating from teacher_ratings so UI matches DB source of truth.

CREATE OR REPLACE VIEW public.teachers_with_ratings AS
SELECT
  t.id,
  t.full_name,
  t.department,
  t.email,
  t.created_at,
  t.updated_at,
  COALESCE(rc.cnt, 0)::int AS ratings_count,
  rc.avg AS average_rating
FROM public.teachers t
LEFT JOIN (
  SELECT
    teacher_id,
    COUNT(*)::int AS cnt,
    ROUND(AVG(rating::numeric), 2) AS avg
  FROM public.teacher_ratings
  GROUP BY teacher_id
) rc ON rc.teacher_id = t.id;

GRANT SELECT ON public.teachers_with_ratings TO anon, authenticated, service_role;
