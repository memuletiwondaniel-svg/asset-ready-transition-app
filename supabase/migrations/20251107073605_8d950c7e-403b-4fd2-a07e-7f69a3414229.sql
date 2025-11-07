-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own checklists" ON public.checklists;

-- Create a new permissive delete policy that allows anyone to delete
CREATE POLICY "Anyone can delete checklists" 
ON public.checklists 
FOR DELETE 
USING (true);