-- Migration: Update documents application URL in public.applications table
-- Target file: /Users/a/Codes/community-portal/supabase/migrations/20260629233800_update_docs_url.sql

UPDATE public.applications
SET url = 'http://docs.localtest.me:3000'
WHERE slug = 'documents';
