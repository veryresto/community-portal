-- Drop restrictive select policies on document_spaces
DROP POLICY IF EXISTS "Anyone can view public spaces" ON public.document_spaces;
DROP POLICY IF EXISTS "Approved residents can view all visible spaces" ON public.document_spaces;
DROP POLICY IF EXISTS "Anyone can view visible spaces" ON public.document_spaces;

-- Create permissive select policy so backend server can fetch all configured spaces anonymously
CREATE POLICY "Anyone can view visible spaces" ON public.document_spaces
  FOR SELECT USING (is_visible = true);
