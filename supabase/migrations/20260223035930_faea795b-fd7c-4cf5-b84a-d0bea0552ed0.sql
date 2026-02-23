
-- Update SELECT policy on pssrs to allow PSSR leads to view their assigned PSSRs
DROP POLICY IF EXISTS "Users can view their own PSSRs" ON public.pssrs;

CREATE POLICY "Users can view their own PSSRs" 
ON public.pssrs 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = pssr_lead_id);
