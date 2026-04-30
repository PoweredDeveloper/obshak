
-- Drop overly permissive policies
DROP POLICY "Users can update own profile" ON public.profiles;
DROP POLICY "Service role can insert profiles" ON public.profiles;

-- No INSERT/UPDATE policies needed — edge functions use service_role which bypasses RLS
