-- Add access_rules column to document_spaces table
ALTER TABLE public.document_spaces 
  ADD COLUMN IF NOT EXISTS access_rules JSONB DEFAULT '{}'::jsonb;

-- Backfill legacy records to preserve backwards compatibility
UPDATE public.document_spaces
SET access_rules = '{}'::jsonb
WHERE permission IS NULL;

UPDATE public.document_spaces
SET access_rules = '{"participant_types": ["resident"], "roles": ["admin"]}'::jsonb
WHERE permission = 'documents.minutes';

UPDATE public.document_spaces
SET access_rules = '{"roles": ["admin", "finance"]}'::jsonb
WHERE permission = 'documents.finance';
