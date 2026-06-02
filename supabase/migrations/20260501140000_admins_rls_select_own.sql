-- Let authenticated clients verify admin row for own telegram_id (RPC fallback + debugging).
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read own admin row" ON public.admins;

CREATE POLICY "Authenticated users read own admin row"
ON public.admins
FOR SELECT
TO authenticated
USING (
  telegram_id = (
    SELECT p.telegram_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);
