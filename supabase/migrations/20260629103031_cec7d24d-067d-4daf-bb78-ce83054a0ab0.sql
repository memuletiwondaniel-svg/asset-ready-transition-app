-- 1. evidence_type column
ALTER TABLE public.p2a_vcr_evidence
  ADD COLUMN IF NOT EXISTS evidence_type text;

-- 2. Delivering-party helper for the VCR-evidence table (prereq-scoped)
CREATE OR REPLACE FUNCTION public.is_p2a_vcr_evidence_delivering_party(_prereq_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.p2a_vcr_prerequisites pp
    JOIN public.vcr_item_delivering_parties dp
      ON dp.handover_point_id = pp.handover_point_id
     AND dp.vcr_item_id = pp.vcr_item_id
    WHERE pp.id = _prereq_id
      AND dp.user_id = auth.uid()
  );
$$;

-- 3. Replace permissive write policies with delivering-party gates
DROP POLICY IF EXISTS "Authenticated users can manage VCR evidence (INSERT)" ON public.p2a_vcr_evidence;
DROP POLICY IF EXISTS "Authenticated users can manage VCR evidence (DELETE)" ON public.p2a_vcr_evidence;
DROP POLICY IF EXISTS "Authenticated users can manage VCR evidence (UPDATE)" ON public.p2a_vcr_evidence;

CREATE POLICY "Delivering party can add VCR evidence"
  ON public.p2a_vcr_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_p2a_vcr_evidence_delivering_party(vcr_prerequisite_id));

CREATE POLICY "Delivering party can update VCR evidence"
  ON public.p2a_vcr_evidence
  FOR UPDATE
  TO authenticated
  USING (public.is_p2a_vcr_evidence_delivering_party(vcr_prerequisite_id))
  WITH CHECK (public.is_p2a_vcr_evidence_delivering_party(vcr_prerequisite_id));

CREATE POLICY "Delivering party can delete VCR evidence"
  ON public.p2a_vcr_evidence
  FOR DELETE
  TO authenticated
  USING (public.is_p2a_vcr_evidence_delivering_party(vcr_prerequisite_id));

-- 4. Engine config: correct MS + HS leads, bump version so cached insights invalidate
UPDATE public.vcr_insights_agent_config
   SET lead_agent = 'alex',
       contrib_agents = ARRAY['selma']::text[],
       config_version = config_version + 1,
       updated_at = now()
 WHERE category_code = 'MS';

UPDATE public.vcr_insights_agent_config
   SET lead_agent = 'hannah',
       contrib_agents = ARRAY['selma']::text[],
       config_version = config_version + 1,
       updated_at = now()
 WHERE category_code = 'HS';
