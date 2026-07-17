-- Migration: Add activity_type column to document_downloads table
-- Target file: /Users/a/Codes/community-portal/supabase/migrations/20260629225500_add_activity_type.sql

ALTER TABLE public.document_downloads 
ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'DOWNLOAD' NOT NULL;
