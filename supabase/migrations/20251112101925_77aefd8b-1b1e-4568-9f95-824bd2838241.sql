-- Create ORM deliverable types enum
CREATE TYPE orm_deliverable_type AS ENUM (
  'ASSET_REGISTER',
  'PREVENTIVE_MAINTENANCE',
  'BOM_DEVELOPMENT',
  'OPERATING_SPARES',
  'IMS_UPDATE',
  'PM_ACTIVATION'
);

-- Create ORM workflow stages enum
CREATE TYPE orm_workflow_stage AS ENUM (
  'IN_PROGRESS',
  'QAQC_REVIEW',
  'LEAD_REVIEW',
  'CENTRAL_TEAM_REVIEW',
  'APPROVED',
  'REJECTED'
);

-- Create ORM plans table
CREATE TABLE IF NOT EXISTS public.orm_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  orm_lead_id UUID NOT NULL,
  scope_description TEXT,
  estimated_completion_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED')),
  overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create ORM deliverables table
CREATE TABLE IF NOT EXISTS public.orm_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orm_plan_id UUID NOT NULL REFERENCES public.orm_plans(id) ON DELETE CASCADE,
  deliverable_type orm_deliverable_type NOT NULL,
  workflow_stage orm_workflow_stage NOT NULL DEFAULT 'IN_PROGRESS',
  assigned_resource_id UUID,
  qaqc_reviewer_id UUID,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  start_date DATE,
  completion_date DATE,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORM tasks table
CREATE TABLE IF NOT EXISTS public.orm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.orm_deliverables(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_date DATE,
  completion_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORM daily reports table
CREATE TABLE IF NOT EXISTS public.orm_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.orm_deliverables(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  work_completed TEXT NOT NULL,
  hours_worked NUMERIC NOT NULL,
  challenges TEXT,
  next_day_plan TEXT,
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORM workflow comments table
CREATE TABLE IF NOT EXISTS public.orm_workflow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.orm_deliverables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  workflow_stage orm_workflow_stage NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORM attachments table
CREATE TABLE IF NOT EXISTS public.orm_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.orm_deliverables(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('EVIDENCE', 'REFERENCE', 'WORKFLOW_DOCUMENT')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ORM document checklist table
CREATE TABLE IF NOT EXISTS public.orm_document_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.orm_deliverables(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  is_received BOOLEAN DEFAULT false,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_orm_plans_project ON public.orm_plans(project_id);
CREATE INDEX idx_orm_plans_lead ON public.orm_plans(orm_lead_id);
CREATE INDEX idx_orm_deliverables_plan ON public.orm_deliverables(orm_plan_id);
CREATE INDEX idx_orm_deliverables_resource ON public.orm_deliverables(assigned_resource_id);
CREATE INDEX idx_orm_tasks_deliverable ON public.orm_tasks(deliverable_id);
CREATE INDEX idx_orm_tasks_assigned ON public.orm_tasks(assigned_to);
CREATE INDEX idx_orm_reports_deliverable ON public.orm_daily_reports(deliverable_id);
CREATE INDEX idx_orm_reports_user ON public.orm_daily_reports(submitted_by);
CREATE INDEX idx_orm_reports_date ON public.orm_daily_reports(report_date);

-- Enable RLS
ALTER TABLE public.orm_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_workflow_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_document_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ORM plans they are involved in"
  ON public.orm_plans FOR SELECT
  USING (
    auth.uid() = created_by 
    OR auth.uid() = orm_lead_id 
    OR user_is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orm_deliverables d
      WHERE d.orm_plan_id = orm_plans.id
      AND (d.assigned_resource_id = auth.uid() OR d.qaqc_reviewer_id = auth.uid())
    )
  );

CREATE POLICY "ORM leads can create plans"
  ON public.orm_plans FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "ORM leads can update their plans"
  ON public.orm_plans FOR UPDATE
  USING (auth.uid() = orm_lead_id OR auth.uid() = created_by OR user_is_admin(auth.uid()));

CREATE POLICY "Users can view deliverables for their ORMs"
  ON public.orm_deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_plans p
      WHERE p.id = orm_deliverables.orm_plan_id
      AND (p.orm_lead_id = auth.uid() OR p.created_by = auth.uid() OR user_is_admin(auth.uid()))
    )
    OR auth.uid() = assigned_resource_id
    OR auth.uid() = qaqc_reviewer_id
  );

CREATE POLICY "ORM leads can manage deliverables"
  ON public.orm_deliverables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_plans p
      WHERE p.id = orm_deliverables.orm_plan_id
      AND (p.orm_lead_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "Assigned users can update their deliverables"
  ON public.orm_deliverables FOR UPDATE
  USING (auth.uid() = assigned_resource_id);

CREATE POLICY "Users can view their tasks"
  ON public.orm_tasks FOR SELECT
  USING (auth.uid() = assigned_to OR auth.uid() = created_by OR user_is_admin(auth.uid()));

CREATE POLICY "Users can manage tasks"
  ON public.orm_tasks FOR ALL
  USING (auth.uid() = created_by OR user_is_admin(auth.uid()));

CREATE POLICY "Assigned users can update their tasks"
  ON public.orm_tasks FOR UPDATE
  USING (auth.uid() = assigned_to);

CREATE POLICY "Users can view reports for their deliverables"
  ON public.orm_daily_reports FOR SELECT
  USING (
    auth.uid() = submitted_by
    OR EXISTS (
      SELECT 1 FROM public.orm_deliverables d
      JOIN public.orm_plans p ON p.id = d.orm_plan_id
      WHERE d.id = orm_daily_reports.deliverable_id
      AND (p.orm_lead_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "Resources can submit their reports"
  ON public.orm_daily_reports FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view workflow comments"
  ON public.orm_workflow_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverables d
      JOIN public.orm_plans p ON p.id = d.orm_plan_id
      WHERE d.id = orm_workflow_comments.deliverable_id
      AND (
        p.orm_lead_id = auth.uid() 
        OR d.assigned_resource_id = auth.uid()
        OR d.qaqc_reviewer_id = auth.uid()
        OR user_is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can add workflow comments"
  ON public.orm_workflow_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view attachments"
  ON public.orm_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverables d
      JOIN public.orm_plans p ON p.id = d.orm_plan_id
      WHERE d.id = orm_attachments.deliverable_id
      AND (
        p.orm_lead_id = auth.uid() 
        OR d.assigned_resource_id = auth.uid()
        OR d.qaqc_reviewer_id = auth.uid()
        OR user_is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can upload attachments"
  ON public.orm_attachments FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their attachments"
  ON public.orm_attachments FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can view document checklist"
  ON public.orm_document_checklist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverables d
      JOIN public.orm_plans p ON p.id = d.orm_plan_id
      WHERE d.id = orm_document_checklist.deliverable_id
      AND (
        p.orm_lead_id = auth.uid() 
        OR d.assigned_resource_id = auth.uid()
        OR user_is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage document checklist"
  ON public.orm_document_checklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverables d
      JOIN public.orm_plans p ON p.id = d.orm_plan_id
      WHERE d.id = orm_document_checklist.deliverable_id
      AND (p.orm_lead_id = auth.uid() OR d.assigned_resource_id = auth.uid())
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_orm_plans_updated_at
  BEFORE UPDATE ON public.orm_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orm_deliverables_updated_at
  BEFORE UPDATE ON public.orm_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orm_tasks_updated_at
  BEFORE UPDATE ON public.orm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orm_document_checklist_updated_at
  BEFORE UPDATE ON public.orm_document_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_daily_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_workflow_comments;

-- Set replica identity
ALTER TABLE public.orm_plans REPLICA IDENTITY FULL;
ALTER TABLE public.orm_deliverables REPLICA IDENTITY FULL;
ALTER TABLE public.orm_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.orm_daily_reports REPLICA IDENTITY FULL;
ALTER TABLE public.orm_workflow_comments REPLICA IDENTITY FULL;