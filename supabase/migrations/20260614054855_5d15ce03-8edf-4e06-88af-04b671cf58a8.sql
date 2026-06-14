-- Helper: is the current user the actionable Phase-1 ORA Lead for this VCR?
-- True iff there exists a PENDING ora_lead vcr_plan_approvers row for them on this
-- handover point, AND no row on the same VCR is currently REJECTED.
-- status='PENDING' on the ORA row implicitly means Phase-1 (she hasn't approved yet),
-- so the grant evaporates the moment she approves or any rejection lands.
CREATE OR REPLACE FUNCTION public.is_actionable_ora_lead(p_handover_point_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_handover_point_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.vcr_plan_approvers a
      WHERE a.handover_point_id = p_handover_point_id
        AND a.role_key = 'ora_lead'
        AND a.user_id = auth.uid()
        AND a.status = 'PENDING'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.vcr_plan_approvers r
      WHERE r.handover_point_id = p_handover_point_id
        AND r.status = 'REJECTED'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_actionable_ora_lead(uuid) TO authenticated;

-- Apply scoped INSERT/UPDATE/DELETE policies on every Snr-ORA-Engr-locked VCR child table.
-- All six tables share the same column: handover_point_id.

-- p2a_vcr_training
CREATE POLICY "ORA Lead Phase-1 can insert VCR training"
  ON public.p2a_vcr_training FOR INSERT TO authenticated
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can update VCR training"
  ON public.p2a_vcr_training FOR UPDATE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id))
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can delete VCR training"
  ON public.p2a_vcr_training FOR DELETE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id));

-- p2a_vcr_procedures
CREATE POLICY "ORA Lead Phase-1 can insert VCR procedures"
  ON public.p2a_vcr_procedures FOR INSERT TO authenticated
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can update VCR procedures"
  ON public.p2a_vcr_procedures FOR UPDATE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id))
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can delete VCR procedures"
  ON public.p2a_vcr_procedures FOR DELETE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id));

-- p2a_vcr_critical_docs
CREATE POLICY "ORA Lead Phase-1 can insert critical docs"
  ON public.p2a_vcr_critical_docs FOR INSERT TO authenticated
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can update critical docs"
  ON public.p2a_vcr_critical_docs FOR UPDATE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id))
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can delete critical docs"
  ON public.p2a_vcr_critical_docs FOR DELETE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id));

-- p2a_vcr_cmms
CREATE POLICY "ORA Lead Phase-1 can insert VCR cmms"
  ON public.p2a_vcr_cmms FOR INSERT TO authenticated
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can update VCR cmms"
  ON public.p2a_vcr_cmms FOR UPDATE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id))
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can delete VCR cmms"
  ON public.p2a_vcr_cmms FOR DELETE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id));

-- p2a_vcr_spares
CREATE POLICY "ORA Lead Phase-1 can insert VCR spares"
  ON public.p2a_vcr_spares FOR INSERT TO authenticated
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can update VCR spares"
  ON public.p2a_vcr_spares FOR UPDATE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id))
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can delete VCR spares"
  ON public.p2a_vcr_spares FOR DELETE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id));

-- p2a_vcr_maintenance_deliverables
CREATE POLICY "ORA Lead Phase-1 can insert VCR maint deliverables"
  ON public.p2a_vcr_maintenance_deliverables FOR INSERT TO authenticated
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can update VCR maint deliverables"
  ON public.p2a_vcr_maintenance_deliverables FOR UPDATE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id))
  WITH CHECK (public.is_actionable_ora_lead(handover_point_id));
CREATE POLICY "ORA Lead Phase-1 can delete VCR maint deliverables"
  ON public.p2a_vcr_maintenance_deliverables FOR DELETE TO authenticated
  USING (public.is_actionable_ora_lead(handover_point_id));