-- ============================================
-- ORA Training Plans and Related Tables
-- ============================================

-- Create enum for training status
CREATE TYPE ora_training_status AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_EXECUTION',
  'COMPLETED',
  'CANCELLED'
);

-- Create enum for training item execution stage
CREATE TYPE ora_training_execution_stage AS ENUM (
  'NOT_STARTED',
  'MATERIALS_REQUESTED',
  'MATERIALS_UNDER_REVIEW',
  'MATERIALS_APPROVED',
  'PO_ISSUED',
  'TRAINEES_IDENTIFIED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED'
);

-- Create enum for training approval status
CREATE TYPE ora_training_approval_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- Training Plans table
CREATE TABLE public.ora_training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ora_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status ora_training_status NOT NULL DEFAULT 'DRAFT',
  overall_progress INTEGER DEFAULT 0,
  total_estimated_cost DECIMAL(12, 2) DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

-- Training Items table
CREATE TABLE public.ora_training_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES public.ora_training_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  overview TEXT,
  detailed_description TEXT,
  justification TEXT,
  target_audience TEXT[] DEFAULT '{}', -- e.g., ['OPS', 'MTCE_ELECT', 'MTCE_MECH']
  training_provider TEXT,
  duration_hours INTEGER,
  tentative_date DATE,
  scheduled_date DATE,
  estimated_cost DECIMAL(10, 2) DEFAULT 0,
  actual_cost DECIMAL(10, 2),
  execution_stage ora_training_execution_stage DEFAULT 'NOT_STARTED',
  ta_reviewer_id UUID REFERENCES auth.users(id),
  ta_approval_date TIMESTAMPTZ,
  po_number TEXT,
  po_issued_date DATE,
  trainees TEXT[] DEFAULT '{}', -- Array of trainee names/IDs
  completion_date DATE,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training Plan Approvals table
CREATE TABLE public.ora_training_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES public.ora_training_plans(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL, -- 'PROJECT_HUB_LEAD', 'DEPUTY_PLANT_DIRECTOR', 'PLANT_DIRECTOR', 'ORA_LEAD'
  approver_user_id UUID REFERENCES auth.users(id),
  status ora_training_approval_status NOT NULL DEFAULT 'PENDING',
  comments TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training Materials/Attachments table
CREATE TABLE public.ora_training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_item_id UUID NOT NULL REFERENCES public.ora_training_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  material_type TEXT DEFAULT 'supporting_document', -- 'supporting_document', 'training_material', 'completion_certificate'
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance Readiness table
CREATE TABLE public.ora_maintenance_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ora_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- e.g., 'SPARE_PARTS', 'MAINTENANCE_CONTRACTS', 'TOOLS_EQUIPMENT'
  item_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'NOT_STARTED',
  responsible_person TEXT,
  target_date DATE,
  completion_date DATE,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handover Items table
CREATE TABLE public.ora_handover_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ora_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- e.g., 'DOCUMENTATION', 'SYSTEMS', 'EQUIPMENT'
  item_name TEXT NOT NULL,
  description TEXT,
  from_party TEXT,
  to_party TEXT,
  status TEXT DEFAULT 'PENDING',
  handover_date DATE,
  signed_off_by UUID REFERENCES auth.users(id),
  signed_off_at TIMESTAMPTZ,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_ora_training_plans_ora_plan ON public.ora_training_plans(ora_plan_id);
CREATE INDEX idx_ora_training_plans_status ON public.ora_training_plans(status);
CREATE INDEX idx_ora_training_items_plan ON public.ora_training_items(training_plan_id);
CREATE INDEX idx_ora_training_items_stage ON public.ora_training_items(execution_stage);
CREATE INDEX idx_ora_training_approvals_plan ON public.ora_training_approvals(training_plan_id);
CREATE INDEX idx_ora_training_materials_item ON public.ora_training_materials(training_item_id);
CREATE INDEX idx_ora_maintenance_readiness_plan ON public.ora_maintenance_readiness(ora_plan_id);
CREATE INDEX idx_ora_handover_items_plan ON public.ora_handover_items(ora_plan_id);

-- Enable RLS
ALTER TABLE public.ora_training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ora_training_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ora_training_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ora_training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ora_maintenance_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ora_handover_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Training Plans
CREATE POLICY "ora_training_plans_select" ON public.ora_training_plans FOR SELECT USING (true);
CREATE POLICY "ora_training_plans_insert" ON public.ora_training_plans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_plans_update" ON public.ora_training_plans FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_plans_delete" ON public.ora_training_plans FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for Training Items
CREATE POLICY "ora_training_items_select" ON public.ora_training_items FOR SELECT USING (true);
CREATE POLICY "ora_training_items_insert" ON public.ora_training_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_items_update" ON public.ora_training_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_items_delete" ON public.ora_training_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for Training Approvals
CREATE POLICY "ora_training_approvals_select" ON public.ora_training_approvals FOR SELECT USING (true);
CREATE POLICY "ora_training_approvals_insert" ON public.ora_training_approvals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_approvals_update" ON public.ora_training_approvals FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for Training Materials
CREATE POLICY "ora_training_materials_select" ON public.ora_training_materials FOR SELECT USING (true);
CREATE POLICY "ora_training_materials_insert" ON public.ora_training_materials FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_materials_update" ON public.ora_training_materials FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ora_training_materials_delete" ON public.ora_training_materials FOR DELETE USING (auth.uid() = uploaded_by);

-- RLS Policies for Maintenance Readiness
CREATE POLICY "ora_maintenance_readiness_select" ON public.ora_maintenance_readiness FOR SELECT USING (true);
CREATE POLICY "ora_maintenance_readiness_insert" ON public.ora_maintenance_readiness FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ora_maintenance_readiness_update" ON public.ora_maintenance_readiness FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ora_maintenance_readiness_delete" ON public.ora_maintenance_readiness FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for Handover Items
CREATE POLICY "ora_handover_items_select" ON public.ora_handover_items FOR SELECT USING (true);
CREATE POLICY "ora_handover_items_insert" ON public.ora_handover_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ora_handover_items_update" ON public.ora_handover_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ora_handover_items_delete" ON public.ora_handover_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_ora_training_plans_updated_at
  BEFORE UPDATE ON public.ora_training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ora_training_items_updated_at
  BEFORE UPDATE ON public.ora_training_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ora_maintenance_readiness_updated_at
  BEFORE UPDATE ON public.ora_maintenance_readiness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ora_handover_items_updated_at
  BEFORE UPDATE ON public.ora_handover_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();