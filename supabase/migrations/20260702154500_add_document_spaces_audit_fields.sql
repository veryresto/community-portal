-- Migration: Add audit columns to public.document_spaces and bind reusable timestamp update trigger
-- Target file: /Users/a/Codes/community-platform/supabase/migrations/20260702154500_add_document_spaces_audit_fields.sql

-- 1. Add audit columns
ALTER TABLE public.document_spaces
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Bind existing central timestamp trigger to document_spaces table
CREATE OR REPLACE TRIGGER update_document_spaces_updated_at
  BEFORE UPDATE ON public.document_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
