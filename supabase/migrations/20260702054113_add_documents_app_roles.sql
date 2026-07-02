-- 1. Insert app roles for 'documents' application
INSERT INTO public.app_roles (app_id, name, description)
SELECT id, 'resident', 'Access to standard community documents like meeting minutes'
FROM public.applications WHERE slug = 'documents'
ON CONFLICT (app_id, name) DO NOTHING;

INSERT INTO public.app_roles (app_id, name, description)
SELECT id, 'finance', 'Access to finance and treasury documents'
FROM public.applications WHERE slug = 'documents'
ON CONFLICT (app_id, name) DO NOTHING;

INSERT INTO public.app_roles (app_id, name, description)
SELECT id, 'admin', 'Full administrator access to all document spaces'
FROM public.applications WHERE slug = 'documents'
ON CONFLICT (app_id, name) DO NOTHING;

-- 2. Link app roles to permissions in app_role_permissions
-- Link 'resident' role to 'minutes' permission
INSERT INTO public.app_role_permissions (app_role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.applications app ON ar.app_id = app.id
JOIN public.app_permissions ap ON ap.app_id = app.id
WHERE app.slug = 'documents' AND ar.name = 'resident' AND ap.name = 'minutes'
ON CONFLICT (app_role_id, permission_id) DO NOTHING;

-- Link 'finance' role to 'finance' and 'minutes' permissions
INSERT INTO public.app_role_permissions (app_role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.applications app ON ar.app_id = app.id
JOIN public.app_permissions ap ON ap.app_id = app.id
WHERE app.slug = 'documents' AND ar.name = 'finance' AND ap.name IN ('finance', 'minutes')
ON CONFLICT (app_role_id, permission_id) DO NOTHING;

-- Link 'admin' role to both permissions
INSERT INTO public.app_role_permissions (app_role_id, permission_id)
SELECT ar.id, ap.id
FROM public.app_roles ar
JOIN public.applications app ON ar.app_id = app.id
JOIN public.app_permissions ap ON ap.app_id = app.id
WHERE app.slug = 'documents' AND ar.name = 'admin' AND ap.name IN ('finance', 'minutes')
ON CONFLICT (app_role_id, permission_id) DO NOTHING;
