-- 1. Add onboarding classification columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS participant_type TEXT DEFAULT 'resident',
  ADD COLUMN IF NOT EXISTS resident_subtype TEXT,
  ADD COLUMN IF NOT EXISTS requested_affiliation TEXT;

-- 2. Update existing profiles (default to resident/owner for legacy compatibility)
UPDATE public.profiles
SET participant_type = 'resident',
    resident_subtype = 'owner'
WHERE house_number IS NOT NULL AND participant_type IS NULL;

-- 3. Automatic Baseline Resident Access Trigger
CREATE OR REPLACE FUNCTION public.handle_resident_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trigger condition: status transitions to 'approved' for a user classified as a 'resident'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') AND NEW.participant_type = 'resident' THEN
    
    -- 1. Map to standard resident role for 'ipl_finder'
    INSERT INTO public.user_app_roles (user_id, app_role_id, granted_by)
    SELECT NEW.id, ar.id, auth.uid()
    FROM public.app_roles ar
    JOIN public.applications app ON ar.app_id = app.id
    WHERE app.slug = 'ipl_finder' AND ar.name = 'resident'
    ON CONFLICT (user_id, app_role_id) DO NOTHING;

    -- 2. Map to standard resident role for 'rekap_viewer'
    INSERT INTO public.user_app_roles (user_id, app_role_id, granted_by)
    SELECT NEW.id, ar.id, auth.uid()
    FROM public.app_roles ar
    JOIN public.applications app ON ar.app_id = app.id
    WHERE app.slug = 'rekap_viewer' AND ar.name = 'resident'
    ON CONFLICT (user_id, app_role_id) DO NOTHING;

  END IF;
  RETURN NEW;
END;
$$;

-- Bind trigger to profiles table
DROP TRIGGER IF EXISTS on_profile_approved_assign_resident_roles ON public.profiles;
CREATE TRIGGER on_profile_approved_assign_resident_roles
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_resident_approval();
