-- 1. Create the reusable platform manager check helper function
CREATE OR REPLACE FUNCTION public.is_platform_manager(uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = uid
      AND role IN ('admin', 'resident_verifier', 'platform_moderator')
  );
END;
$$;

-- Add database comment documenting the helper
COMMENT ON FUNCTION public.is_platform_manager(UUID) IS
'Reusable security helper to check if a user holds admin, verifier, or moderator permissions.';

-- 2. Drop the old inline update policy on profiles
DROP POLICY IF EXISTS "Platform managers can update all profiles" ON public.profiles;

-- 3. Re-create the update policy using the new elegant helper function
CREATE POLICY "Platform managers can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_platform_manager(auth.uid()));
