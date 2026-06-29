-- Migration: Initialize Community Documents application and tables
-- Target file: /Users/a/Codes/community-platform/supabase/migrations/20260628224500_community_docs.sql

-- 1. Register the documents application
INSERT INTO public.applications (slug, name, description, url)
VALUES (
  'documents',
  'Community Documents',
  'Governed, searchable access to community documents stored in Google Drive.',
  'http://documents.localtest.me:3001'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Define App Permissions (e.g. finance, minutes) for the documents app
INSERT INTO public.app_permissions (app_id, name, description)
SELECT id, 'finance', 'Access to finance and treasury documents'
FROM public.applications WHERE slug = 'documents'
ON CONFLICT (app_id, name) DO NOTHING;

INSERT INTO public.app_permissions (app_id, name, description)
SELECT id, 'minutes', 'Access to meeting minutes and resident assemblies'
FROM public.applications WHERE slug = 'documents'
ON CONFLICT (app_id, name) DO NOTHING;

-- 3. Create document_spaces table
CREATE TABLE IF NOT EXISTS public.document_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  drive_folder_id TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true NOT NULL,
  permission TEXT, -- e.g. 'documents.finance', NULL for public
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for document_spaces
ALTER TABLE public.document_spaces ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for document_spaces
CREATE POLICY "Anyone can view public spaces" ON public.document_spaces
  FOR SELECT USING (permission IS NULL AND is_visible = true);

CREATE POLICY "Approved residents can view all visible spaces" ON public.document_spaces
  FOR SELECT USING (
    is_visible = true AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND approval_status = 'approved'
    )
  );

CREATE POLICY "Admins can manage spaces" ON public.document_spaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 4. Create document_downloads table
CREATE TABLE IF NOT EXISTS public.document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for public downloads
  drive_file_id TEXT NOT NULL,
  file_name TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  watermark_id TEXT, -- Phase 3 placeholder
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS for document_downloads
ALTER TABLE public.document_downloads ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for document_downloads
CREATE POLICY "Anyone can create download logs" ON public.document_downloads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view download logs" ON public.document_downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
