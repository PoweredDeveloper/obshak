-- Admins (matched via profiles.id = auth.uid()) can list all users + bot analytics.
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can read all admins" ON public.admins;
CREATE POLICY "Admins can read all admins"
ON public.admins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
CREATE POLICY "Admins can insert admins"
ON public.admins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
CREATE POLICY "Admins can delete admins"
ON public.admins
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);

ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_user_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read bot_events" ON public.bot_events;
CREATE POLICY "Admins read bot_events"
ON public.bot_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins read bot_user_status" ON public.bot_user_status;
CREATE POLICY "Admins read bot_user_status"
ON public.bot_user_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);
