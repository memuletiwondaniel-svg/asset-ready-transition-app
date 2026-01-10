-- Drop existing SELECT policy on orp_plans
DROP POLICY IF EXISTS "Users can view their own ORPs" ON public.orp_plans;

-- Create new policy allowing all authenticated users to view ORA plans
CREATE POLICY "Authenticated users can view all ORPs" 
ON public.orp_plans 
FOR SELECT 
USING (auth.uid() IS NOT NULL);