-- Drop the restrictive policy that only allows the PSSR creator to access responses
DROP POLICY IF EXISTS "Users can manage checklist responses for their PSSRs" ON public.pssr_checklist_responses;

-- Create a broader SELECT policy: any authenticated user can view checklist responses
-- (PSSR data is not sensitive — all team members need to see progress)
CREATE POLICY "Authenticated users can view checklist responses"
  ON public.pssr_checklist_responses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Keep write access restricted to PSSR creator/team
CREATE POLICY "Users can insert checklist responses for their PSSRs"
  ON public.pssr_checklist_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pssrs
      WHERE pssrs.id = pssr_checklist_responses.pssr_id
      AND (pssrs.user_id = auth.uid() OR pssrs.pssr_lead_id = auth.uid())
    )
  );

CREATE POLICY "Users can update checklist responses for their PSSRs"
  ON public.pssr_checklist_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pssrs
      WHERE pssrs.id = pssr_checklist_responses.pssr_id
      AND (pssrs.user_id = auth.uid() OR pssrs.pssr_lead_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete checklist responses for their PSSRs"
  ON public.pssr_checklist_responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pssrs
      WHERE pssrs.id = pssr_checklist_responses.pssr_id
      AND pssrs.user_id = auth.uid()
    )
  );