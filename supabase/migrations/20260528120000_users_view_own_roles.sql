-- Allow authenticated users to view their own roles so frontend permission hooks can resolve privileges
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
