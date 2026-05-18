-- 1. Create approval_status enum type
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');

-- 2. Add columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS house_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'pending';

-- Set all existing profiles with an admin role to 'approved', others to 'pending'
UPDATE public.profiles p
SET approval_status = 'approved'
FROM public.user_roles ur
WHERE p.id = ur.user_id AND ur.role = 'admin';

-- 3. Add values to global app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'resident_verifier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_moderator';

-- 4. Create Audit Trail Table
CREATE TABLE public.governance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'approved_resident', 'suspended_resident', 'granted_app_role'
  reason TEXT, -- Critical operational context
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on governance_events
ALTER TABLE public.governance_events ENABLE ROW LEVEL SECURITY;

-- 5. Create Applications Registry Table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- e.g., 'ipl_finder'
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 6. Create App Permissions Table
CREATE TABLE public.app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL, -- e.g., 'upload', 'read'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(app_id, permission_key)
);

-- Enable RLS on app_permissions
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;

-- 7. Create App Roles / Templates Table
CREATE TABLE public.app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., 'admin', 'resident'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(app_id, name)
);

-- Enable RLS on app_roles
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- 8. Create App Role Permissions Join Table
CREATE TABLE public.app_role_permissions (
  app_role_id UUID REFERENCES public.app_roles(id) ON DELETE CASCADE NOT NULL,
  app_permission_id UUID REFERENCES public.app_permissions(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (app_role_id, app_permission_id)
);

-- Enable RLS on app_role_permissions
ALTER TABLE public.app_role_permissions ENABLE ROW LEVEL SECURITY;

-- 9. Create User App Roles Assignment Table
CREATE TABLE public.user_app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_role_id UUID REFERENCES public.app_roles(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, app_role_id)
);

-- Enable RLS on user_app_roles
ALTER TABLE public.user_app_roles ENABLE ROW LEVEL SECURITY;

-- 10. RLS Security Helper for App Developers / Consumers
CREATE OR REPLACE FUNCTION public.has_namespaced_permission(_user_id UUID, _namespaced_perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_slug TEXT;
  v_perm_key TEXT;
BEGIN
  -- Validate inputs
  IF _user_id IS NULL OR _namespaced_perm IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify global approval standing first
  -- If user is suspended or rejected, they instantly lose all app capabilities
  IF NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = _user_id AND approval_status = 'approved'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Extract application slug and permission key from namespaced format (e.g. 'ipl_finder.upload')
  v_app_slug := split_part(_namespaced_perm, '.', 1);
  v_perm_key := split_part(_namespaced_perm, '.', 2);

  RETURN EXISTS (
    SELECT 1 
    FROM public.user_app_roles uar
    JOIN public.app_roles ar ON uar.app_role_id = ar.id
    JOIN public.applications app ON ar.app_id = app.id
    JOIN public.app_role_permissions arp ON arp.app_role_id = ar.id
    JOIN public.app_permissions ap ON arp.app_permission_id = ap.id
    WHERE uar.user_id = _user_id
      AND app.slug = v_app_slug
      AND ap.permission_key = v_perm_key
  );
END;
$$;

-- 11. Legacy Synchronization Trigger for strangler fig backward compatibility
CREATE OR REPLACE FUNCTION public.sync_legacy_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_perm_key TEXT;
BEGIN
  -- Determine user_id to sync based on operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Clear out legacy user permissions mapped from the platform (ipl_finder)
  DELETE FROM public.user_permissions
  WHERE user_id = v_user_id
    AND permission IN ('read_files', 'upload_files');

  -- Fetch all unique permission keys the user has via their active app roles
  FOR v_perm_key IN 
    SELECT DISTINCT ap.permission_key
    FROM public.user_app_roles uar
    JOIN public.app_roles ar ON uar.app_role_id = ar.id
    JOIN public.applications app ON ar.app_id = app.id
    JOIN public.app_role_permissions arp ON arp.app_role_id = ar.id
    JOIN public.app_permissions ap ON arp.app_permission_id = ap.id
    WHERE uar.user_id = v_user_id
      AND app.slug = 'ipl_finder'
  LOOP
    IF v_perm_key = 'read' THEN
      INSERT INTO public.user_permissions (user_id, permission)
      VALUES (v_user_id, 'read_files')
      ON CONFLICT (user_id, permission) DO NOTHING;
    ELSIF v_perm_key = 'upload' THEN
      INSERT INTO public.user_permissions (user_id, permission)
      VALUES (v_user_id, 'upload_files')
      ON CONFLICT (user_id, permission) DO NOTHING;
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER sync_legacy_permissions_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.user_app_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legacy_permissions();

-- 12. Row Level Security Policies
-- General view policy for all authenticated approved profiles
CREATE POLICY "Approved residents can view connected apps and roles"
  ON public.applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND approval_status = 'approved'));

CREATE POLICY "Approved residents can view app roles"
  ON public.app_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND approval_status = 'approved'));

CREATE POLICY "Approved residents can view app role capability mapping"
  ON public.app_role_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND approval_status = 'approved'));

-- Policy for profiles to view their own roles
CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admin policies (full access for global admins)
CREATE POLICY "Global admins can manage applications"
  ON public.applications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- App Developers have autonomy to define capabilities within registered apps
-- (App Dev check will be expanded later, currently defaults to global admins or validated app owners)
CREATE POLICY "Global admins can manage app capabilities"
  ON public.app_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Global admins can manage app templates"
  ON public.app_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Global admins can manage template mappings"
  ON public.app_role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Global admins and verifiers can manage user roles"
  ON public.user_app_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'resident_verifier'));

CREATE POLICY "Global admins can view audit trails"
  ON public.governance_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System and admins can write audit logs"
  ON public.governance_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 13. Pre-seed the system with IPL Finder application, permissions, and roles
DO $$
DECLARE
  v_app_id UUID;
  v_read_perm_id UUID;
  v_upload_perm_id UUID;
  v_resident_role_id UUID;
  v_admin_role_id UUID;
BEGIN
  -- Insert IPL Finder App
  INSERT INTO public.applications (slug, name, url)
  VALUES ('ipl_finder', 'IPL Finder', 'https://ipl-finder.veryresto.com')
  RETURNING id INTO v_app_id;

  -- Insert raw permissions
  INSERT INTO public.app_permissions (app_id, permission_key, description)
  VALUES (v_app_id, 'read', 'Ability to view files and directories')
  RETURNING id INTO v_read_perm_id;

  INSERT INTO public.app_permissions (app_id, permission_key, description)
  VALUES (v_app_id, 'upload', 'Ability to upload and manage files')
  RETURNING id INTO v_upload_perm_id;

  -- Insert App role templates
  INSERT INTO public.app_roles (app_id, name, description)
  VALUES (v_app_id, 'resident', 'Standard resident role with viewing capabilities')
  RETURNING id INTO v_resident_role_id;

  INSERT INTO public.app_roles (app_id, name, description)
  VALUES (v_app_id, 'admin', 'Application administrator role with full capabilities')
  RETURNING id INTO v_admin_role_id;

  -- Link capabilities to roles
  -- 'resident' gets 'read'
  INSERT INTO public.app_role_permissions (app_role_id, app_permission_id)
  VALUES (v_resident_role_id, v_read_perm_id);

  -- 'admin' gets both 'read' and 'upload'
  INSERT INTO public.app_role_permissions (app_role_id, app_permission_id)
  VALUES (v_admin_role_id, v_read_perm_id),
         (v_admin_role_id, v_upload_perm_id);
END;
$$;
