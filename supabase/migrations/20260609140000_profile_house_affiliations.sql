-- Create profile_house_affiliations join table
CREATE TABLE IF NOT EXISTS public.profile_house_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  affiliation_type VARCHAR(30) NOT NULL CHECK (affiliation_type IN ('owner', 'renter', 'household_member', 'caretaker')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, house_id, affiliation_type)
);

-- Index for lookup speed
CREATE INDEX IF NOT EXISTS idx_profile_house_affiliations_profile ON public.profile_house_affiliations (profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_house_affiliations_house ON public.profile_house_affiliations (house_id);

-- Filtered unique index to guarantee at most one active primary affiliation per profile
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_affiliation_per_profile 
ON public.profile_house_affiliations (profile_id) 
WHERE (is_primary = true);

-- Enable RLS
ALTER TABLE public.profile_house_affiliations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Read-only access for authenticated users
CREATE POLICY "Users can view all affiliations"
  ON public.profile_house_affiliations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy 2: Platform managers (admin, resident_verifier) can perform any CRUD operations
CREATE POLICY "Platform managers can manage all affiliations"
  ON public.profile_house_affiliations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'resident_verifier')
    )
  );

-- Backfill existing data from profiles table
INSERT INTO public.profile_house_affiliations (profile_id, house_id, affiliation_type, is_primary)
SELECT 
  p.id, 
  h.id, 
  COALESCE(
    CASE 
      WHEN p.resident_subtype IN ('owner', 'renter', 'household_member', 'caretaker') THEN p.resident_subtype
      ELSE 'owner'
    END, 
    'owner'
  ), 
  true
FROM public.profiles p
JOIN public.houses h ON p.house_number = h.house_number
WHERE p.house_number IS NOT NULL AND p.participant_type = 'resident'
ON CONFLICT (profile_id, house_id, affiliation_type) DO NOTHING;
