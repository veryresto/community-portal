-- Migration: Seed initial document spaces
-- Target file: /Users/a/Codes/community-portal/supabase/migrations/20260628225000_seed_document_spaces.sql

INSERT INTO public.document_spaces (name, slug, description, drive_folder_id, is_visible, permission, display_order)
VALUES 
  (
    'Public Handbook', 
    'handbook', 
    'Ecosystem rules, resident guidelines, utility contacts, and general community announcements.', 
    '1a2b3c4d5e6f7g8h9i0j', -- Replace with actual Google Drive Folder ID
    true, 
    NULL, -- Public
    1
  ),
  (
    'Meeting Minutes', 
    'minutes', 
    'Official records of board decisions, monthly committee minutes, and general assembly transcripts.', 
    '2b3c4d5e6f7g8h9i0j1k', -- Replace with actual Google Drive Folder ID
    true, 
    'documents.minutes', 
    2
  ),
  (
    'Finance & Treasury', 
    'finance', 
    'Monthly budget reviews, balance sheets, maintenance bills, and audit reports.', 
    '3c4d5e6f7g8h9i0j1k2l', -- Replace with actual Google Drive Folder ID
    true, 
    'documents.finance', 
    3
  )
ON CONFLICT (slug) DO NOTHING;
