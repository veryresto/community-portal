-- 1. Add approval_status column with a CHECK constraint and default value
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' 
CONSTRAINT check_approval_status CHECK (approval_status IN ('pending', 'approved', 'suspended', 'rejected'));

-- 2. Backfill statuses based on existing permissions and roles:
-- Set 'rejected' status first for users marked rejected in user_permissions
UPDATE public.profiles 
SET approval_status = 'rejected' 
WHERE id IN (
  SELECT user_id FROM public.user_permissions WHERE permission = 'rejected'
);

-- Set 'approved' status for admins or users with active read/upload permissions (excluding rejected)
UPDATE public.profiles 
SET approval_status = 'approved' 
WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
  UNION
  SELECT user_id FROM public.user_permissions WHERE permission IN ('read_files', 'upload_files')
)
AND approval_status != 'rejected';
