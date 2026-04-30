
-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role can insert (for edge function creating profiles)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update (for edge function updates)
CREATE POLICY "Service role can update profiles"
  ON public.profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can select (for edge function lookups)
CREATE POLICY "Service role can select profiles"
  ON public.profiles
  FOR SELECT
  TO service_role
  USING (true);
