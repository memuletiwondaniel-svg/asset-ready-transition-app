-- Allow anonymous users to create checklists
DROP POLICY IF EXISTS "Users can create checklists" ON public.checklists;

CREATE POLICY "Anyone can create checklists" 
ON public.checklists 
FOR INSERT 
WITH CHECK (true);

-- Update the view policy to show all checklists to everyone
DROP POLICY IF EXISTS "Users can view all checklists" ON public.checklists;

CREATE POLICY "Anyone can view all checklists" 
ON public.checklists 
FOR SELECT 
USING (true);