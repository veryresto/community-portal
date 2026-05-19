-- 1. One-time backfill of user_app_roles from legacy user_permissions
-- Users with upload_files mapped to 'admin' role
INSERT INTO public.user_app_roles (user_id, app_role_id, granted_by)
SELECT 
  up.user_id, 
  ar.id AS app_role_id,
  up.granted_by
FROM public.user_permissions up
JOIN public.app_roles ar ON ar.name = 'admin'
JOIN public.applications app ON ar.app_id = app.id
WHERE app.slug = 'ipl_finder' 
  AND up.permission = 'upload_files'
ON CONFLICT (user_id, app_role_id) DO NOTHING;

-- Users with read_files and NOT upload_files mapped to 'resident' role
INSERT INTO public.user_app_roles (user_id, app_role_id, granted_by)
SELECT 
  up.user_id, 
  ar.id AS app_role_id,
  up.granted_by
FROM public.user_permissions up
JOIN public.app_roles ar ON ar.name = 'resident'
JOIN public.applications app ON ar.app_id = app.id
WHERE app.slug = 'ipl_finder' 
  AND up.permission = 'read_files'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up2 
    WHERE up2.user_id = up.user_id AND up2.permission = 'upload_files'
  )
ON CONFLICT (user_id, app_role_id) DO NOTHING;

-- 2. Drop legacy RLS policies on public.files and public.activity_logs
DROP POLICY IF EXISTS "Approved users can view files" ON public.files;
DROP POLICY IF EXISTS "Users with upload permission can upload files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_logs;

-- 3. Recreate policies using the central public.has_namespaced_permission helper
CREATE POLICY "Approved users can view files" ON public.files FOR SELECT
USING (public.has_namespaced_permission(auth.uid(), 'ipl_finder.read_files'));

CREATE POLICY "Users with upload permission can upload files" ON public.files FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id AND 
  public.has_namespaced_permission(auth.uid(), 'ipl_finder.upload_files')
);

CREATE POLICY "Users can delete own files" ON public.files FOR DELETE
USING (
  auth.uid() = uploader_id AND 
  public.has_namespaced_permission(auth.uid(), 'ipl_finder.upload_files')
);

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can insert own activity" ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
