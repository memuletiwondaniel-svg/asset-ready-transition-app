-- Create ORM milestones table
CREATE TABLE IF NOT EXISTS public.orm_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orm_plan_id UUID NOT NULL REFERENCES public.orm_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  linked_deliverables UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ORM deliverable templates table
CREATE TABLE IF NOT EXISTS public.orm_deliverable_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  deliverable_type orm_deliverable_type NOT NULL,
  estimated_hours NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ORM template tasks table
CREATE TABLE IF NOT EXISTS public.orm_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.orm_deliverable_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  estimated_days INTEGER,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ORM template checklists table
CREATE TABLE IF NOT EXISTS public.orm_template_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.orm_deliverable_templates(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orm_milestones_plan ON public.orm_milestones(orm_plan_id);
CREATE INDEX IF NOT EXISTS idx_orm_milestones_target_date ON public.orm_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_orm_deliverable_templates_type ON public.orm_deliverable_templates(deliverable_type);
CREATE INDEX IF NOT EXISTS idx_orm_template_tasks_template ON public.orm_template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_orm_template_checklists_template ON public.orm_template_checklists(template_id);

-- Enable RLS
ALTER TABLE public.orm_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_deliverable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orm_template_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orm_milestones
CREATE POLICY "Users can view milestones for their ORMs"
  ON public.orm_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_plans p
      WHERE p.id = orm_milestones.orm_plan_id
      AND (p.created_by = auth.uid() OR p.orm_lead_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "ORM leads can manage milestones"
  ON public.orm_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_plans p
      WHERE p.id = orm_milestones.orm_plan_id
      AND (p.orm_lead_id = auth.uid() OR p.created_by = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

-- RLS Policies for orm_deliverable_templates
CREATE POLICY "Anyone can view active templates"
  ON public.orm_deliverable_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.orm_deliverable_templates FOR ALL
  USING (user_is_admin(auth.uid()));

CREATE POLICY "Users can create templates"
  ON public.orm_deliverable_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for orm_template_tasks
CREATE POLICY "Anyone can view template tasks"
  ON public.orm_template_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverable_templates t
      WHERE t.id = orm_template_tasks.template_id AND t.is_active = true
    )
  );

CREATE POLICY "Template creators can manage tasks"
  ON public.orm_template_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverable_templates t
      WHERE t.id = orm_template_tasks.template_id 
      AND (t.created_by = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

-- RLS Policies for orm_template_checklists
CREATE POLICY "Anyone can view template checklists"
  ON public.orm_template_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverable_templates t
      WHERE t.id = orm_template_checklists.template_id AND t.is_active = true
    )
  );

CREATE POLICY "Template creators can manage checklists"
  ON public.orm_template_checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orm_deliverable_templates t
      WHERE t.id = orm_template_checklists.template_id 
      AND (t.created_by = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

-- Create function to auto-calculate milestone progress
CREATE OR REPLACE FUNCTION public.calculate_orm_milestone_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate progress based on linked deliverables
  IF array_length(NEW.linked_deliverables, 1) > 0 THEN
    SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
    INTO NEW.progress_percentage
    FROM public.orm_deliverables
    WHERE id = ANY(NEW.linked_deliverables);
    
    -- Update status based on progress
    IF NEW.progress_percentage = 100 THEN
      NEW.status := 'COMPLETED';
      NEW.completion_date := CURRENT_DATE;
    ELSIF NEW.progress_percentage > 0 THEN
      NEW.status := 'IN_PROGRESS';
    END IF;
    
    -- Check if delayed
    IF NEW.target_date IS NOT NULL AND NEW.target_date < CURRENT_DATE AND NEW.status != 'COMPLETED' THEN
      NEW.status := 'DELAYED';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for milestone progress calculation
DROP TRIGGER IF EXISTS calculate_milestone_progress_trigger ON public.orm_milestones;
CREATE TRIGGER calculate_milestone_progress_trigger
  BEFORE INSERT OR UPDATE ON public.orm_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_orm_milestone_progress();

-- Create trigger for updated_at
CREATE TRIGGER update_orm_milestones_updated_at
  BEFORE UPDATE ON public.orm_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orm_deliverable_templates_updated_at
  BEFORE UPDATE ON public.orm_deliverable_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orm_deliverable_templates;

-- Insert default templates
INSERT INTO public.orm_deliverable_templates (name, description, deliverable_type, estimated_hours) VALUES
  ('Standard Asset Register', 'Complete asset register build with all equipment details', 'ASSET_REGISTER', 80),
  ('Standard PM Routine', 'Preventive maintenance routine development', 'PREVENTIVE_MAINTENANCE', 60),
  ('Standard BOM', 'Bill of materials development for new project', 'BOM_DEVELOPMENT', 100),
  ('Standard Operating Spares', '2-Year operating spares identification and listing', 'OPERATING_SPARES', 70),
  ('Standard IMS Update', 'Integrity management system update and documentation', 'IMS_UPDATE', 50),
  ('Standard PM Activation', 'PM system activation and testing', 'PM_ACTIVATION', 40)
ON CONFLICT DO NOTHING;