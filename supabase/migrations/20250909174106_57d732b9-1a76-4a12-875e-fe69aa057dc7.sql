-- Create checklist_items table to store master checklist data
CREATE TABLE public.checklist_items (
  id text PRIMARY KEY,
  description text NOT NULL,
  category text NOT NULL,
  topic text,
  supporting_evidence text,
  responsible_party text,
  approving_authority text,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create checklist_uploads table to track upload history
CREATE TABLE public.checklist_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL,
  file_path text NOT NULL,
  upload_status text NOT NULL DEFAULT 'PENDING',
  items_processed integer DEFAULT 0,
  items_added integer DEFAULT 0,
  items_updated integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  error_log text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist_items
CREATE POLICY "Admin users can manage checklist items" 
ON public.checklist_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  )
);

CREATE POLICY "All users can view active checklist items" 
ON public.checklist_items 
FOR SELECT 
USING (is_active = true);

-- RLS policies for checklist_uploads
CREATE POLICY "Admin users can manage checklist uploads" 
ON public.checklist_uploads 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  )
);

-- Create storage bucket for Excel uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checklist-uploads', 'checklist-uploads', false);

-- Storage policies for checklist uploads
CREATE POLICY "Admin users can upload checklist files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'checklist-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  )
);

CREATE POLICY "Admin users can view checklist files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'checklist-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::user_role
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the provided checklist data
INSERT INTO public.checklist_items (id, description, category, topic, supporting_evidence, responsible_party, approving_authority) VALUES
('X01', 'Have all Priority 1 actions from the PSSR walkdown been closed out?', 'General', 'PSSR Walkdown', '', 'Project Engr', 'TA2, ORA, Dep Plant Dir.'),
('X02', 'Has a Root Cause Analysis (RCA) been carried out and the Root Cause for the incidence Identified?', 'General', 'RCA', '', 'Proj HSE Lead', 'TA2, Deputy Plant Dir'),
('X03', 'Have all actions from the RCA been closed out?', 'General', 'RCA', '', 'Proj HSE Lead', 'TA2, Deputy Plant Dir'),
('A01', 'Have all Safety Critical Elements (SCEs) been identified and tested against the applicable SCE Performance Standards to make sure they work?', 'Hardware Integrity', 'SCE', 'TIV report', '', ''),
('A02', 'Have all construction and commissioning activities been completed? Have all the outstanding scopes been reviewed and confirmed to have no impact on safe start-up and introduction of hydrocarbons?', 'Hardware Integrity', 'Project Scope', 'Completions Dossiers, ITR Report', 'Commissioning Lead, Construction Lead', 'TA2, ORA, Dep Plant Dir.'),
('A03', 'Have all Punchlist-A items been closed out? Have all Punchlist-B items been reviewed and confirmed to have no impact on safe start-up and introduction of hydrocarbons?', 'Hardware Integrity', 'Punchlists', 'Punchlist Report', 'Commissioning Lead, Construction Lead', 'TA2, ORA, Dep Plant Dir.'),
('A04', 'Have all MOC actions been implemented and verified on site? Have all open MOC actions been reviewed and confirmed to have no impact on safe start-up and introduction of hydrocarbons?', 'Hardware Integrity', 'MoCs', 'Project MOC Report', 'Project Manager', 'TA2, ORA, Dep Plant Dir.'),
('A05', 'Have all STQs been approved and implemented? Have all open STQs been reviewed and confirmed to have no impact on safe start-up and introduction of hydrocarbons?', 'Hardware Integrity', 'STQs', 'STQ Register, NCR Register', 'Project Engineer', 'TA2, ORA, Dep Plant Dir.'),
('B01', 'Have all DEM 1 requirements and other standards listed in the project BfD been fully complied with? Are all DEM 1 derogations reviewed and approved?', 'Process Safety', 'DEM 1', 'DEM 1 Compliance Report, ALARP Demonstration Report', 'Project Engineer', 'TA2'),
('B02', 'Have all DEM 2 requirements a been fully complied with? Are all DEM 2 derogations reviewed and approved?', 'Process Safety', 'DEM 2', 'DEM 2 Compliance Report', 'Project Engineer', 'TA2'),
('B03', 'Are all actions from HEMP Studies (e.g. HAZOP, HAZID and SIL assessment) closed out?', 'Process Safety', 'HEMP', 'HEMP Close-out Report', 'Project Engineer', 'TSE TA2, ORA'),
('B04', 'Have all actions from the Operating Mode Assurance Review (OMAR) been closed out?', 'Process Safety', 'OMAR', 'OMAR Close-out Report', 'Project Engineer', 'TA2, ORA, Deputy Plat Dir'),
('B05', 'Have all overrides or inhibits on any safety critical system or alarm been removed? Are all outstanding overrides or inhibits documented, risk-assessed and confirmed to have no impact on start-up and introduction of hydrocarbons?', 'Process Safety', 'Overrides', 'Override Register & System download', 'Commissioning Lead', 'TA2-PACO, TA2-TSE, ORA, Dep Plant Dir'),
('B06', 'Has the Variable Table has been developed and implemented? Have all Alarms have been tested and verified accordingly?', 'Process Safety', 'Alarms', 'Signed-off Variable Table', 'Commissioning Lead', 'TA2-PACO, TA2-TSE, ORA, Dep Plant Dir'),
('B07', 'Has the Lock-Open/ Lock-Closed register been updated and implemented at site?', 'Process Safety', 'LOLC', 'LOLC Register', 'ORA Engineer', 'Dep Plant Dir'),
('B08', 'Have all construction and commission blinds been removed? Are all spec blinds lined-up as per the approved Start-Up Procedure?', 'Process Safety', 'Blinds', 'Signed-off Spade Register', 'Commissioning Lead', 'ORA, Dep Plant Dir'),
('B09', 'Have all existing Isolations (Process, Electrical & Instrumentation) been reviewed and confirmed to have no impact on safe start-up and the introduction of hydrocarbons? Have all required isolations been implemented to enable safe introduction of hydrocarbons?', 'Process Safety', 'Isolations/ Registers', '', 'Commissioning Lead', 'ORA, Dep Plant Dir'),
('B10', 'Have staff in Safety Critical Positions (ops and maintenance) been suitably trained on both start-up and on the continued operation of the new facility?', 'Process Safety', 'Training', 'Training Records', 'ORA Engineer', 'Dep Plant Dir'),
('B11', 'Has Emergency Response plans and scenarios (Pre-Incident Plans - PIP) been updated to reflect the new facilities, signed-off and cascaded to the relevant teams?', 'Process Safety', 'ER', '', 'Project HSE Lead', 'TA2-ER, Dep Plant Dir'),
('B12', 'Has the Asset Register been built and loaded into the CMMS with SCE''s classified?', 'Process Safety', 'CMMS', '', 'ORA', 'TA2'),
('C01', 'Has the initial Start-Up and Normal Operating Procedure been reviewed, approved for use and translated?', 'Documentation', 'Procedures', 'signed-off ISUP and NOP', 'ORA Engineer', 'Dep Plant Dir'),
('C02', 'Are Operator Logsheets available and updated to reflect the project scope?', 'Documentation', 'Logsheets', '', 'ORA Engineer', 'Dep Plant Dir'),
('C03', 'P&IDs', 'Documentation', 'P&IDs', '', '', ''),
('C04', 'Cause & Effect Diagram', 'Documentation', 'Cause & Effect Diagram', '', '', ''),
('C05', 'Variable Table', 'Documentation', 'Variable Table', '', '', ''),
('C06', 'Plot Layout', 'Documentation', 'Plot Layout', '', '', ''),
('C07', 'Key Single Line Diagram', 'Documentation', 'Key Single Line Diagram', '', '', ''),
('C08', 'Hazardous Area Classification (HAC) Drawings', 'Documentation', 'HAC Drawings', '', '', ''),
('C09', 'MSDS', 'Documentation', 'MSDS', '', '', ''),
('D01', 'Has the start-up organization, roles & responsibilities been defined and resourced accordingly?', 'Organization', 'Resourcing', 'SU Organization Chart', 'ORA Engineer', 'Dep Plant Dir'),
('D02', 'Are specialist vendors available to support start-up activities?', 'Organization', 'Resourcing', 'SU Organization Chart', 'Project Engineer', 'Dep Plant Dir'),
('D03', 'Has a Start-up on Paper Exercise been carried out and all oustanding actions closed out?', 'Organization', 'Communication', 'SUOP Action Register, MoM', 'ORA Engineer', 'Dep Plant Dir, TA2- Process, Static, TSE'),
('D05', 'Has a safety Induction and orientation been carried out for all concerned staff?', 'Organization', 'Training', 'Safety Induction Attendance Sheet', 'Proj HSE Lead', 'OPS HSE, Dep Plant Dir.'),
('D06', 'Have communication protocols with affected units and departments have been developed, reviewed and approved for use during start-up and normal operations?', 'Organization', 'Communication', '', 'ORA Engineer', 'Dep Plant Dir'),
('D07', 'Are there any operating conditions (upstream and downstream) that can affect safe start-up?', 'Organization', 'Communication', 'email Confirmation from Units/ Department', '', 'Dep Plant Dir'),
('E01', 'Have all Priority 1 items from the PSSR walkdown been closed out?', 'Health & Safety', 'PSSR Walkdown', '', '', 'TA2, ORA, Dep Plant Dir.'),
('E02', 'Have PTW custodianship been transferred from the Project to Asset?', 'Health & Safety', 'PTW', 'Signed-off PtW Custodianship Transfer Form', 'Proj HSE Lead', 'OPS HSE, ORA, Dep Plant Dir'),
('E03', 'Have Site Access Control been fully implemented? Have all prerequiste for safe access to the site (e.g. escape sets, gas detectors) been fully implemented?', 'Health & Safety', 'ER', '', 'Project Engineer', 'Security, Dep Plant Dir.'),
('E04', 'Have all non-essential staff (people who do not need to be there) been removed from the site?', 'Health & Safety', 'ER', '', 'ORA Engineer', 'Dep Plant Dir'),
('E05', 'Have Emergency Response Teams been notified of the start-up? Is the ER team resourced and equipped to respond in the event of an emergency?', 'Health & Safety', 'ER', 'email confirmation from ERT Lead', 'ORA Engineer', 'TA2-ER'),
('EL-01', 'Have all Ex Equipment been correctly installed, inspected and within certification?', 'Electrical', 'Ex Equip', 'Signed-off Ex Register', 'Commissioning Lead', 'TA-Elect'),
('EL-02', 'Have all electrical protective relays and safety devices been calibrated?', 'Electrical', 'Protection Systems', 'Signed-off ITR-B and Test Records', '', 'TA-Elect'),
('EL-03', 'Have conduit fittings and cable transits been properly sealed?', 'Electrical', 'Ingress Protection', '', '', 'TA-Elect'),
('EL-04', 'Have all MCC, Electrical Switchgear and Start/Stop switches been properly labelled?', 'Electrical', 'Tagging & Labeling', '', '', 'TA-Elect'),
('EL-05', 'Have Earthing on all systems, equipment and structures been correctly installed?', 'Electrical', 'Earthing', '', '', 'TA-Elect'),
('MS-01', 'Have all flanges been correctly torqued and verified?', 'Mechanical', 'Flange Management', 'Flange Management Report', 'Construction Lead', 'TA-Static'),
('MS-02', 'Have all piping, pipeline, valves, vessels and equipment been leak tested?', 'Mechanical', 'Leak Testing', 'Leak Test Report', 'Commissioning Lead', 'TA-Static'),
('MS-03', 'Have all Safety Relief Valves been inspected, tested and tagged?', 'Mechanical', 'Relief Valves', 'PSV Certificates', 'Commissioning Lead', 'TA-Static'),
('MR-01', 'Has an SAT been completed for all Rotating Equipment and all actions closed out?', 'Mechanical', 'SAT - Rot Equip', 'SAT Report', 'Commissioning Lead', 'TA-Rotating'),
('MR-02', 'Have all lubricants and seal fluids been properly charged', 'Mechanical', 'Lubrication & Seal Fluids', '', 'Commissioning Lead', 'TA-Rotating'),
('MR-03', 'Are Guards in place for Pumps and fans?', 'Mechanical', 'Guards', '', '', ''),
('IN-01', 'Has the IPF and FGS Cause & Effects been fully tested and signed-off?', 'Instrumentation', 'Cause & Effect', 'Signed-off Cause & Effect Sheets', 'Commissioning Lead', 'TA2-PACO, TA2-TSE'),
('IN-02', 'Are all Fire & Gas detectors and system operational?', 'Instrumentation', 'FGS', 'Signed-off FGS Cause & Effect Sheet', 'Commissioning Lead', 'TA2-PACO, TA2-TSE'),
('IN-03', 'Have all control loops been function tested and verified against the process control narrative?', 'Instrumentation', 'Control Loops', 'Signed-off PCN/ CTP', 'Commissioning Lead', 'TA2-PACO'),
('IN-04', 'Have all actions from the Control and Safeguardiung System SIT and SAT been closed out? Have all open actions been reviewed and confirmed to have no impact on safe start-up and introduction of hydrocarbons?', 'Instrumentation', 'SIT and SAT - PACO', 'Signed-off SAT/ SIT Report', 'Commissioning Lead', 'TA2-PACO'),
('CX-01', 'Have all Civil structures, foundations and support been installed as per design?', 'Civil', 'Structures, Supports & Foundations', '', 'Construction Lead', 'TA2-Civil'),
('CX-02', 'Are bunding, draining, and curbing provided in accordance with design?', 'Civil', 'Bunding', '', 'Construction Lead', 'TA2-Civil'),
('CX-03', 'Are all vent and drains clear and free of debris? Are all caps, plugs and gratings are in place and correctly installed?', 'Civil', 'Vent & Drains', '', 'Construction Lead', 'TA2-Civil'),
('HS-01', 'Have all combustible materials, Temporary Piping, Scaffolding materials and shutdown materials have been removed from site?', 'HSE', 'House Keeping', 'Pictures from Site Walkdown', 'Proj HSE Lead', 'ORA, Ops Coach, Site Engr,'),
('HS-02', 'Are all safety signs and equipment (e.g. fire extinguishers, eye wash kits and showers) in place as per the approved Plot Layout?', 'HSE', 'Safety Signage& Equipment', '', 'Proj HSE Lead', 'Ops HSE'),
('HS-03', 'Are MSDS visible and correctly placed where required?', 'HSE', 'MSDS', '', 'Proj HSE Lead', 'Ops HSE'),
('HS-04', 'Are High-noise areas clearly identified with warning signs in place?', 'HSE', 'Noise', '', 'Proj HSE Lead', 'Ops HSE'),
('HS-05', 'Is chemical storage suitably bunded and spill kits present?', 'HSE', 'Chemical Storage', '', 'Proj HSE Lead', 'Ops HSE'),
('ER-01', 'Are all Escape Routes clearly marked and free of obstruction?', 'Emergency Response', 'Escape Routes', '', 'Proj HSE Lead', 'TA2-ER, Ops HSE'),
('ER-02', 'Is unobstructed access to safety and fire protection equipment provided?', 'Emergency Response', 'Access', '', 'Proj HSE Lead', 'TA2-ER, Ops HSE');