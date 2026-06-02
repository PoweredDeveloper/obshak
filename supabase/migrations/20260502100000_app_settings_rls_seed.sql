-- Readable feature flags for everyone; writes only for rows matching admins + profile.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_read" ON public.app_settings;
CREATE POLICY "app_settings_read"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "app_settings_admin_insert" ON public.app_settings;
CREATE POLICY "app_settings_admin_insert"
ON public.app_settings
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

DROP POLICY IF EXISTS "app_settings_admin_update" ON public.app_settings;
CREATE POLICY "app_settings_admin_update"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admins a
    INNER JOIN public.profiles p ON p.telegram_id = a.telegram_id
    WHERE p.id = auth.uid()
  )
);

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'features.services_enabled',
  'false'::jsonb,
  'Показывать раздел «Услуги» в приложении'
)
ON CONFLICT (key) DO NOTHING;
