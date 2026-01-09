-- Create ora_activity_catalog table for managing ORA activities and deliverables
CREATE TABLE public.ora_activity_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL CHECK (phase IN ('IDENTIFY', 'ASSESS', 'SELECT', 'DEFINE', 'EXECUTE', 'OPERATE')),
  level TEXT NOT NULL DEFAULT 'L1' CHECK (level IN ('L1', 'L2')),
  area TEXT NOT NULL DEFAULT 'ORM' CHECK (area IN ('ORM', 'FEO', 'CSU')),
  activity_id TEXT NOT NULL,
  
  entry_type TEXT NOT NULL DEFAULT 'activity' CHECK (entry_type IN ('activity', 'critical_task', 'control_point', 'deliverable')),
  requirement_level TEXT NOT NULL DEFAULT 'mandatory' CHECK (requirement_level IN ('mandatory', 'optional', 'scalable')),
  
  name TEXT NOT NULL,
  description TEXT,
  discipline TEXT,
  applicable_business TEXT DEFAULT 'All',
  
  estimated_manhours INTEGER,
  outcome_evidence TEXT,
  rolled_up_in_document TEXT,
  dcaf_control_point TEXT,
  pmf_controls TEXT[],
  ams_processes TEXT[],
  
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  or_toolbox_section TEXT,
  tools_templates TEXT,
  precursors TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_ora_activity_catalog_phase ON public.ora_activity_catalog(phase);
CREATE INDEX idx_ora_activity_catalog_area ON public.ora_activity_catalog(area);
CREATE INDEX idx_ora_activity_catalog_entry_type ON public.ora_activity_catalog(entry_type);
CREATE INDEX idx_ora_activity_catalog_is_active ON public.ora_activity_catalog(is_active);

-- Enable RLS
ALTER TABLE public.ora_activity_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow authenticated users to read
CREATE POLICY "Authenticated users can view ora_activity_catalog"
ON public.ora_activity_catalog
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert ora_activity_catalog"
ON public.ora_activity_catalog
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update ora_activity_catalog"
ON public.ora_activity_catalog
FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete ora_activity_catalog"
ON public.ora_activity_catalog
FOR DELETE
TO authenticated
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_ora_activity_catalog_updated_at
BEFORE UPDATE ON public.ora_activity_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for common milestones if project_milestone_types table exists
INSERT INTO public.project_milestone_types (code, name, description, display_order, is_active)
VALUES
  ('FEED_COMPLETE', 'FEED Complete', 'Front End Engineering Design Complete', 1, true),
  ('FID', 'Final Investment Decision', 'Final Investment Decision milestone', 2, true),
  ('MC', 'Mechanical Completion', 'Mechanical Completion milestone', 3, true),
  ('RFSU', 'Ready for Start-up', 'Ready for Start-up milestone', 4, true),
  ('PAC', 'Provisional Handover', 'Provisional Acceptance Certificate', 5, true),
  ('FAC', 'Final Handover', 'Final Acceptance Certificate', 6, true),
  ('PCAP', 'Project Control Assurance Plan', 'PCAP for all ORP phases', 7, true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample ORA activities from DDP structure
INSERT INTO public.ora_activity_catalog (phase, level, area, activity_id, entry_type, requirement_level, name, description, discipline, estimated_manhours, outcome_evidence, display_order)
VALUES
  -- ASSESS Phase
  ('ASSESS', 'L1', 'ORM', '1.00', 'activity', 'mandatory', 'ORM Strategy', 'Develop Operations Readiness Management strategy for the project', 'ORM', 40, 'ORM Strategy Document', 1),
  ('ASSESS', 'L1', 'ORM', '2.00', 'activity', 'mandatory', 'Stakeholder Engagement', 'Identify and engage key stakeholders for operations readiness', 'ORM', 24, 'Stakeholder Register', 2),
  ('ASSESS', 'L1', 'FEO', '3.00', 'activity', 'mandatory', 'Facility Assessment', 'Assess facility requirements and constraints', 'FEO', 80, 'Facility Assessment Report', 3),
  
  -- SELECT Phase
  ('SELECT', 'L1', 'ORM', '1.00', 'deliverable', 'mandatory', 'Basis for Design (BfD)', 'Document establishing the design basis for the project', 'Engineering', 120, 'BfD Document', 1),
  ('SELECT', 'L1', 'ORM', '2.00', 'deliverable', 'mandatory', 'Concept Select Report (CSR)', 'Report documenting concept selection rationale', 'Engineering', 160, 'CSR Document', 2),
  ('SELECT', 'L1', 'ORM', '3.00', 'deliverable', 'mandatory', 'Project Execution Strategy (PES)', 'Strategy document for project execution approach', 'PM', 80, 'PES Document', 3),
  
  -- DEFINE Phase
  ('DEFINE', 'L1', 'ORM', '1.00', 'deliverable', 'mandatory', 'Basic Design Engineering Package (BDEP)', 'Complete basic design engineering documentation', 'Engineering', 400, 'BDEP Package', 1),
  ('DEFINE', 'L1', 'ORM', '2.00', 'deliverable', 'mandatory', 'Project Execution Plan (PEP)', 'Detailed project execution plan', 'PM', 120, 'PEP Document', 2),
  ('DEFINE', 'L1', 'ORM', '3.00', 'control_point', 'mandatory', 'Self Assurance Review (SAR4)', 'Self assurance review checkpoint', 'QA', 40, 'SAR4 Report', 3),
  
  -- EXECUTE Phase
  ('EXECUTE', 'L1', 'ORM', '1.00', 'activity', 'mandatory', 'Construction Management', 'Manage construction activities', 'Construction', 800, 'Construction Reports', 1),
  ('EXECUTE', 'L1', 'CSU', '2.00', 'activity', 'mandatory', 'Commissioning Planning', 'Plan commissioning activities', 'CSU', 200, 'Commissioning Plan', 2),
  ('EXECUTE', 'L1', 'CSU', '3.00', 'deliverable', 'mandatory', 'Pre-Commissioning Dossier', 'Documentation for pre-commissioning', 'CSU', 160, 'Pre-Comm Dossier', 3),
  
  -- OPERATE Phase
  ('OPERATE', 'L1', 'ORM', '1.00', 'activity', 'mandatory', 'Operations Handover', 'Handover to operations team', 'Operations', 120, 'Handover Certificate', 1),
  ('OPERATE', 'L1', 'ORM', '2.00', 'activity', 'mandatory', 'Performance Monitoring', 'Monitor facility performance post-handover', 'Operations', 200, 'Performance Reports', 2);