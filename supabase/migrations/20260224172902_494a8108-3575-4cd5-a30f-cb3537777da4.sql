-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own PSSRs" ON public.pssrs;

-- Create a new policy allowing all authenticated users to view all PSSRs
CREATE POLICY "Authenticated users can view all PSSRs"
ON public.pssrs
FOR SELECT
USING (auth.uid() IS NOT NULL);