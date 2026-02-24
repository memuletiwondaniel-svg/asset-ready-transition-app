-- Update the UPDATE policy to allow both the creator and the PSSR Lead to update
DROP POLICY "Users can update their own PSSRs" ON public.pssrs;

CREATE POLICY "Users can update their own PSSRs"
ON public.pssrs
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = pssr_lead_id);