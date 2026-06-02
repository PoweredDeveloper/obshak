-- Keep teachers.average_rating and teachers.ratings_count in sync with teacher_ratings
-- (UI reads aggregates from public.teachers; without this, stars save but list stays "—")

CREATE OR REPLACE FUNCTION public.refresh_teacher_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  v_avg numeric;
  v_cnt int;
BEGIN
  tid := COALESCE(NEW.teacher_id, OLD.teacher_id);

  SELECT ROUND(AVG(rating::numeric), 2), COUNT(*)::int
  INTO v_avg, v_cnt
  FROM public.teacher_ratings
  WHERE teacher_id = tid;

  IF v_cnt IS NULL OR v_cnt = 0 THEN
    UPDATE public.teachers
    SET average_rating = NULL, ratings_count = 0
    WHERE id = tid;
  ELSE
    UPDATE public.teachers
    SET average_rating = v_avg, ratings_count = v_cnt
    WHERE id = tid;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_teacher_ratings_refresh ON public.teacher_ratings;

CREATE TRIGGER tr_teacher_ratings_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.teacher_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_teacher_rating_stats();

-- Backfill from existing rows
UPDATE public.teachers t
SET
  average_rating = x.avg,
  ratings_count = x.cnt
FROM (
  SELECT
    teacher_id,
    ROUND(AVG(rating::numeric), 2) AS avg,
    COUNT(*)::int AS cnt
  FROM public.teacher_ratings
  GROUP BY teacher_id
) x
WHERE t.id = x.teacher_id;

UPDATE public.teachers
SET average_rating = NULL, ratings_count = 0
WHERE id NOT IN (SELECT teacher_id FROM public.teacher_ratings);
