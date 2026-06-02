
-- Tighten RLS on VCR deliverable detail tables: writes restricted to canonical 'Sr ORA Engr' role.
-- SELECT remains broadly readable to authenticated (other surfaces read these).

-- p2a_vcr_training
DROP POLICY IF EXISTS "P2A users can manage VCR training (INSERT)" ON public.p2a_vcr_training;
DROP POLICY IF EXISTS "P2A users can manage VCR training (UPDATE)" ON public.p2a_vcr_training;
DROP POLICY IF EXISTS "P2A users can manage VCR training (DELETE)" ON public.p2a_vcr_training;
CREATE POLICY "Sr ORA Engr can insert VCR training" ON public.p2a_vcr_training
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update VCR training" ON public.p2a_vcr_training
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete VCR training" ON public.p2a_vcr_training
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));

-- p2a_vcr_procedures
DROP POLICY IF EXISTS "P2A users can manage VCR procedures (INSERT)" ON public.p2a_vcr_procedures;
DROP POLICY IF EXISTS "P2A users can manage VCR procedures (UPDATE)" ON public.p2a_vcr_procedures;
DROP POLICY IF EXISTS "P2A users can manage VCR procedures (DELETE)" ON public.p2a_vcr_procedures;
CREATE POLICY "Sr ORA Engr can insert VCR procedures" ON public.p2a_vcr_procedures
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update VCR procedures" ON public.p2a_vcr_procedures
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete VCR procedures" ON public.p2a_vcr_procedures
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));

-- p2a_vcr_operational_registers
DROP POLICY IF EXISTS "P2A users can manage VCR operational registers (INSERT)" ON public.p2a_vcr_operational_registers;
DROP POLICY IF EXISTS "P2A users can manage VCR operational registers (UPDATE)" ON public.p2a_vcr_operational_registers;
DROP POLICY IF EXISTS "P2A users can manage VCR operational registers (DELETE)" ON public.p2a_vcr_operational_registers;
CREATE POLICY "Sr ORA Engr can insert VCR operational registers" ON public.p2a_vcr_operational_registers
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update VCR operational registers" ON public.p2a_vcr_operational_registers
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete VCR operational registers" ON public.p2a_vcr_operational_registers
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));

-- p2a_vcr_critical_docs
DROP POLICY IF EXISTS "P2A users can manage critical docs (INSERT)" ON public.p2a_vcr_critical_docs;
DROP POLICY IF EXISTS "P2A users can manage critical docs (UPDATE)" ON public.p2a_vcr_critical_docs;
DROP POLICY IF EXISTS "P2A users can manage critical docs (DELETE)" ON public.p2a_vcr_critical_docs;
DROP POLICY IF EXISTS "p2a_vcr_critical_docs write auth" ON public.p2a_vcr_critical_docs;
CREATE POLICY "Sr ORA Engr can insert critical docs" ON public.p2a_vcr_critical_docs
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update critical docs" ON public.p2a_vcr_critical_docs
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete critical docs" ON public.p2a_vcr_critical_docs
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));

-- p2a_vcr_cmms (currently has FOR ALL)
DROP POLICY IF EXISTS "p2a_vcr_cmms write auth" ON public.p2a_vcr_cmms;
CREATE POLICY "Sr ORA Engr can insert VCR cmms" ON public.p2a_vcr_cmms
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update VCR cmms" ON public.p2a_vcr_cmms
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete VCR cmms" ON public.p2a_vcr_cmms
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));

-- p2a_vcr_spares (currently has FOR ALL)
DROP POLICY IF EXISTS "p2a_vcr_spares write auth" ON public.p2a_vcr_spares;
CREATE POLICY "Sr ORA Engr can insert VCR spares" ON public.p2a_vcr_spares
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update VCR spares" ON public.p2a_vcr_spares
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete VCR spares" ON public.p2a_vcr_spares
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));

-- p2a_itp_activities (witness/hold ITP)
DROP POLICY IF EXISTS "P2A users can insert ITP activities" ON public.p2a_itp_activities;
DROP POLICY IF EXISTS "P2A users can update ITP activities" ON public.p2a_itp_activities;
DROP POLICY IF EXISTS "P2A users can delete ITP activities" ON public.p2a_itp_activities;
CREATE POLICY "Sr ORA Engr can insert ITP activities" ON public.p2a_itp_activities
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can update ITP activities" ON public.p2a_itp_activities
  FOR UPDATE TO authenticated USING (public.current_user_has_role('Sr ORA Engr')) WITH CHECK (public.current_user_has_role('Sr ORA Engr'));
CREATE POLICY "Sr ORA Engr can delete ITP activities" ON public.p2a_itp_activities
  FOR DELETE TO authenticated USING (public.current_user_has_role('Sr ORA Engr'));
