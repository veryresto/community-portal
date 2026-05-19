-- ============================================================================
-- 1. LEGACY COMPATIBILITY TRIGGER HOTFIX
-- ============================================================================

-- IMPORTANT:
-- user_permissions is a legacy compatibility layer only.
-- Canonical permissions live in the new App-RBAC tables (applications, app_roles, app_permissions, user_app_roles).
-- This trigger projects effective IPL Finder permissions into the legacy row-per-permission format
-- to maintain compatibility during the migration window.
-- SCHEDULED FOR COMPLETE SUNSET/REMOVAL POST IPL FINDER CUTOVER (PHASE 5).
CREATE OR REPLACE FUNCTION public.sync_legacy_permissions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target_user_id UUID;
  app_slug_val TEXT;
  role_name_val TEXT;
  has_read BOOLEAN := FALSE;
  has_upload BOOLEAN := FALSE;
BEGIN
  -- Determine target user and app role depending on INSERT or DELETE action
  IF (TG_OP = 'DELETE') THEN
    target_user_id := OLD.user_id;
    SELECT app.slug, ar.name INTO app_slug_val, role_name_val
    FROM public.app_roles ar
    JOIN public.applications app ON ar.app_id = app.id
    WHERE ar.id = OLD.app_role_id;
  ELSE
    target_user_id := NEW.user_id;
    SELECT app.slug, ar.name INTO app_slug_val, role_name_val
    FROM public.app_roles ar
    JOIN public.applications app ON ar.app_id = app.id
    WHERE ar.id = NEW.app_role_id;
  END IF;

  -- We only target legacy compatibility for the 'ipl_finder' application
  IF app_slug_val = 'ipl_finder' THEN
    -- Check what app roles user still holds for ipl_finder
    SELECT 
      EXISTS (
        SELECT 1 FROM public.user_app_roles uar
        JOIN public.app_roles ar ON uar.app_role_id = ar.id
        JOIN public.applications app ON ar.app_id = app.id
        JOIN public.app_role_permissions arp ON arp.app_role_id = ar.id
        JOIN public.app_permissions ap ON arp.permission_id = ap.id
        WHERE uar.user_id = target_user_id AND app.slug = 'ipl_finder' AND ap.name = 'read_files'
      ),
      EXISTS (
        SELECT 1 FROM public.user_app_roles uar
        JOIN public.app_roles ar ON uar.app_role_id = ar.id
        JOIN public.applications app ON ar.app_id = app.id
        JOIN public.app_role_permissions arp ON arp.app_role_id = ar.id
        JOIN public.app_permissions ap ON arp.permission_id = ap.id
        WHERE uar.user_id = target_user_id AND app.slug = 'ipl_finder' AND ap.name = 'upload_files'
      )
    INTO has_read, has_upload;

    -- Properly synchronize 'read_files' permission row
    IF has_read THEN
      INSERT INTO public.user_permissions (user_id, permission)
      VALUES (target_user_id, 'read_files')
      ON CONFLICT (user_id, permission) DO NOTHING;
    ELSE
      DELETE FROM public.user_permissions
      WHERE user_id = target_user_id AND permission = 'read_files';
    END IF;

    -- Properly synchronize 'upload_files' permission row
    IF has_upload THEN
      INSERT INTO public.user_permissions (user_id, permission)
      VALUES (target_user_id, 'upload_files')
      ON CONFLICT (user_id, permission) DO NOTHING;
    ELSE
      DELETE FROM public.user_permissions
      WHERE user_id = target_user_id AND permission = 'upload_files';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- Database catalog-level metadata documenting purpose and sunset milestone
COMMENT ON FUNCTION public.sync_legacy_permissions() IS
'Temporary compatibility layer (Phase 4 Strangler Pattern) scheduled for removal after IPL Finder cutover';

-- ============================================================================
-- 2. IMMUTABLE GOVERNANCE AUDIT LOGGING TRIGGER
-- ============================================================================

-- Automatically logs all user app role assignments and revocations to the governance ledger
-- regardless of entry point (UI, SQL command, API call, seed scripts).
CREATE OR REPLACE FUNCTION public.log_user_app_role_governance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  app_slug_val TEXT;
  role_name_val TEXT;
  actor_id UUID;
BEGIN
  -- Identify the auth user performing the action (NULL if system/migration tool)
  actor_id := auth.uid();

  IF (TG_OP = 'DELETE') THEN
    SELECT app.slug, ar.name INTO app_slug_val, role_name_val
    FROM public.app_roles ar
    JOIN public.applications app ON ar.app_id = app.id
    WHERE ar.id = OLD.app_role_id;

    INSERT INTO public.governance_events (actor_user_id, target_user_id, action, reason, metadata)
    VALUES (
      actor_id,
      OLD.user_id,
      'revoked_app_role',
      'Ecosystem application role assignment revoked',
      jsonb_build_object(
        'app_slug', app_slug_val,
        'role_name', role_name_val,
        'trigger_source', 'db_trigger_log_user_app_role_governance'
      )
    );
  ELSE
    SELECT app.slug, ar.name INTO app_slug_val, role_name_val
    FROM public.app_roles ar
    JOIN public.applications app ON ar.app_id = app.id
    WHERE ar.id = NEW.app_role_id;

    INSERT INTO public.governance_events (actor_user_id, target_user_id, action, reason, metadata)
    VALUES (
      actor_id,
      NEW.user_id,
      'assigned_app_role',
      'Ecosystem application role assignment granted',
      jsonb_build_object(
        'app_slug', app_slug_val,
        'role_name', role_name_val,
        'trigger_source', 'db_trigger_log_user_app_role_governance'
      )
    );
  END IF;

  RETURN NULL;
END;
$$;

-- Create the trigger binding for user_app_roles audit log
DROP TRIGGER IF EXISTS log_user_app_role_governance_trg ON public.user_app_roles;
CREATE TRIGGER log_user_app_role_governance_trg
AFTER INSERT OR DELETE ON public.user_app_roles
FOR EACH ROW EXECUTE FUNCTION public.log_user_app_role_governance();

-- Catalog metadata documenting purpose
COMMENT ON FUNCTION public.log_user_app_role_governance() IS
'Audit logging trigger (Phase 4 App-RBAC) that automatically records all app role changes in the governance_events ledger';
