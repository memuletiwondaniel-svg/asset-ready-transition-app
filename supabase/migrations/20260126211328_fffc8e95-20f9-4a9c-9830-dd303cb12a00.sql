-- Create table for PLIP document types with codes and descriptions
CREATE TABLE public.plip_document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2)),
  category TEXT NOT NULL DEFAULT 'General',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plip_document_types ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read document types
CREATE POLICY "Authenticated users can view document types"
  ON public.plip_document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage document types
CREATE POLICY "Admins can manage document types"
  ON public.plip_document_types
  FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_plip_document_types_updated_at
  BEFORE UPDATE ON public.plip_document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial PLIP document types based on industry standards
INSERT INTO public.plip_document_types (code, name, description, tier, category, display_order) VALUES
-- Tier 1 - Critical Documentation (Process & Engineering)
('PX-2365', 'Process Engineering Flow Scheme', 'Process flow diagrams and schematics', 1, 'Process Engineering', 1),
('PX-2366', 'Piping & Instrumentation Diagram (P&ID)', 'Detailed P&ID drawings', 1, 'Process Engineering', 2),
('PX-2367', 'Cause & Effect Diagram', 'Cause and effect matrices for safety systems', 1, 'Process Engineering', 3),
('PX-2368', 'Process Data Sheets', 'Equipment process data specifications', 1, 'Process Engineering', 4),
('PX-2369', 'Heat & Material Balance', 'Process heat and material balance calculations', 1, 'Process Engineering', 5),

-- Tier 1 - Critical Documentation (Electrical & Instrumentation)
('EX-3401', 'Key Single Line Diagram', 'Electrical single line diagrams', 1, 'Electrical', 10),
('EX-3402', 'Hazardous Area Classification (HAC)', 'HAC drawings and zone classifications', 1, 'Electrical', 11),
('EX-3403', 'Variable Table', 'DCS/PLC variable and tag listings', 1, 'Instrumentation', 12),
('EX-3404', 'Control Narrative', 'Control system logic narratives', 1, 'Instrumentation', 13),
('EX-3405', 'Alarm Rationalisation', 'Alarm management philosophy and lists', 1, 'Instrumentation', 14),

-- Tier 1 - Critical Documentation (Safety & HSSE)
('SX-4501', 'Safety Case', 'Safety case documentation', 1, 'Safety', 20),
('SX-4502', 'HAZOP Study Report', 'Hazard and operability study reports', 1, 'Safety', 21),
('SX-4503', 'SIL Assessment', 'Safety integrity level assessments', 1, 'Safety', 22),
('SX-4504', 'MSDS/SDS', 'Material safety data sheets', 1, 'Safety', 23),
('SX-4505', 'Emergency Response Plan', 'Emergency response and evacuation plans', 1, 'Safety', 24),

-- Tier 1 - Critical Documentation (Mechanical)
('MX-5601', 'Plot Layout', 'Site and equipment plot layouts', 1, 'Mechanical', 30),
('MX-5602', 'Equipment Layout Drawings', 'Detailed equipment arrangement drawings', 1, 'Mechanical', 31),
('MX-5603', 'Rotating Equipment Datasheet', 'Compressor, pump, turbine specifications', 1, 'Mechanical', 32),
('MX-5604', 'Static Equipment Datasheet', 'Vessel, heat exchanger specifications', 1, 'Mechanical', 33),
('MX-5605', 'Piping Specifications', 'Piping class and material specifications', 1, 'Mechanical', 34),

-- Tier 1 - Critical Documentation (Operations)
('OX-6701', 'Operations Philosophy', 'Plant operations philosophy document', 1, 'Operations', 40),
('OX-6702', 'Maintenance Strategy', 'Maintenance strategy and philosophy', 1, 'Operations', 41),
('OX-6703', 'Integrity Management Plan', 'Asset integrity management plan', 1, 'Operations', 42),
('OX-6704', 'HSSE Manual', 'HSSE management system manual', 1, 'Operations', 43),

-- Tier 2 - Supporting Documentation
('TX-7801', 'Competency Framework', 'Competency assurance framework', 2, 'Training', 50),
('TX-7802', 'Training Matrix', 'Role-based training requirements matrix', 2, 'Training', 51),
('TX-7803', 'Training Records', 'Training completion records', 2, 'Training', 52),

('PW-7901', 'PTW Procedure', 'Permit to work procedures', 2, 'Procedures', 60),
('PW-7902', 'MOC Procedure', 'Management of change procedure', 2, 'Procedures', 61),
('PW-7903', 'Isolation Procedure', 'Isolation and lock-out procedure', 2, 'Procedures', 62),
('PW-7904', 'SIMOPS Procedure', 'Simultaneous operations procedure', 2, 'Procedures', 63),

('MN-8001', 'RCM Plan', 'Reliability centered maintenance plan', 2, 'Maintenance', 70),
('MN-8002', 'Spare Parts Strategy', 'Spare parts management strategy', 2, 'Maintenance', 71),
('MN-8003', 'Corrosion Strategy', 'Corrosion management strategy', 2, 'Maintenance', 72),
('MN-8004', 'Lubrication Schedule', 'Equipment lubrication schedules', 2, 'Maintenance', 73),

('CM-8101', 'Contractor Management', 'Contractor management procedure', 2, 'Contracts', 80),
('CM-8102', 'Vendor Documentation', 'Vendor manuals and documentation', 2, 'Contracts', 81),

('EN-8201', 'Environmental Management Plan', 'Environmental management plan', 2, 'Environmental', 90),
('EN-8202', 'Waste Management Plan', 'Waste management procedure', 2, 'Environmental', 91);

-- Add comment
COMMENT ON TABLE public.plip_document_types IS 'PLIP (Pre-Launch Integration Plan) document types with codes and descriptions for Red Line Markup (RLMU) tracking';