-- Redefine is_platform_manager helper function to ONLY check for admin and resident_verifier roles
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
      AND role IN ('admin', 'resident_verifier')
  );
END;
$$;

COMMENT ON FUNCTION public.is_platform_manager(UUID) IS
'Reusable security helper to check if a user holds admin or verifier permissions (excluding platform_moderator).';
