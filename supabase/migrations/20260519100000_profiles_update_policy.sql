-- Allow platform managers (admins, verifiers, moderators) to update resident profiles (e.g. approval standing)
CREATE POLICY "Platform managers can update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id::text = auth.uid()::text 
    AND role::text IN ('admin', 'resident_verifier', 'platform_moderator')
  ));
