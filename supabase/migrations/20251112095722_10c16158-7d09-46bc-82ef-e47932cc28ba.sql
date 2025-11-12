-- Create ORP activity log table
CREATE TABLE IF NOT EXISTS public.orp_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE public.orp_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity log
CREATE POLICY "Users can view activity logs for their ORPs"
  ON public.orp_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_plans
      WHERE id = orp_activity_log.orp_plan_id
      AND (created_by = auth.uid() OR ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "System can create activity logs"
  ON public.orp_activity_log FOR INSERT
  WITH CHECK (true);

-- Create ORP templates table
CREATE TABLE IF NOT EXISTS public.orp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('brownfield', 'greenfield', 'expansion')),
  phase TEXT NOT NULL CHECK (phase IN ('ASSESS_SELECT', 'DEFINE', 'EXECUTE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.orp_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Anyone can view active templates"
  ON public.orp_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.orp_templates FOR ALL
  USING (user_is_admin(auth.uid()));

-- Create template deliverables table
CREATE TABLE IF NOT EXISTS public.orp_template_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.orp_templates(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES public.orp_deliverables_catalog(id) ON DELETE CASCADE,
  estimated_manhours NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template deliverables
ALTER TABLE public.orp_template_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS policies for template deliverables
CREATE POLICY "Anyone can view template deliverables"
  ON public.orp_template_deliverables FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template deliverables"
  ON public.orp_template_deliverables FOR ALL
  USING (user_is_admin(auth.uid()));

-- Create template approval workflow
CREATE TABLE IF NOT EXISTS public.orp_template_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.orp_templates(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template approvals
ALTER TABLE public.orp_template_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for template approvals
CREATE POLICY "Anyone can view template approvals"
  ON public.orp_template_approvals FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template approvals"
  ON public.orp_template_approvals FOR ALL
  USING (user_is_admin(auth.uid()));

-- Create function to log ORP activity
CREATE OR REPLACE FUNCTION public.log_orp_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_uuid UUID;
  activity_desc TEXT;
  activity_entity TEXT;
BEGIN
  -- Determine plan_id based on table
  IF TG_TABLE_NAME = 'orp_plans' THEN
    plan_uuid := COALESCE(NEW.id, OLD.id);
    activity_entity := 'plan';
  ELSIF TG_TABLE_NAME = 'orp_plan_deliverables' THEN
    plan_uuid := COALESCE(NEW.orp_plan_id, OLD.orp_plan_id);
    activity_entity := 'deliverable';
  ELSIF TG_TABLE_NAME = 'orp_approvals' THEN
    plan_uuid := COALESCE(NEW.orp_plan_id, OLD.orp_plan_id);
    activity_entity := 'approval';
  ELSIF TG_TABLE_NAME = 'orp_resources' THEN
    plan_uuid := COALESCE(NEW.orp_plan_id, OLD.orp_plan_id);
    activity_entity := 'resource';
  ELSIF TG_TABLE_NAME = 'orp_deliverable_attachments' THEN
    SELECT pd.orp_plan_id INTO plan_uuid
    FROM public.orp_plan_deliverables pd
    WHERE pd.id = COALESCE(NEW.plan_deliverable_id, OLD.plan_deliverable_id);
    activity_entity := 'attachment';
  ELSIF TG_TABLE_NAME = 'orp_collaborators' THEN
    SELECT pd.orp_plan_id INTO plan_uuid
    FROM public.orp_plan_deliverables pd
    WHERE pd.id = COALESCE(NEW.plan_deliverable_id, OLD.plan_deliverable_id);
    activity_entity := 'collaborator';
  END IF;

  -- Build description based on operation
  IF TG_OP = 'INSERT' THEN
    activity_desc := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    activity_desc := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    activity_desc := 'deleted';
  END IF;

  -- Insert activity log
  INSERT INTO public.orp_activity_log (
    orp_plan_id,
    user_id,
    activity_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    plan_uuid,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_OP,
    activity_entity,
    COALESCE(NEW.id, OLD.id),
    activity_desc,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE to_jsonb(OLD)
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for activity logging
CREATE TRIGGER log_orp_plan_activity
AFTER INSERT OR UPDATE OR DELETE ON public.orp_plans
FOR EACH ROW EXECUTE FUNCTION public.log_orp_activity();

CREATE TRIGGER log_orp_deliverable_activity
AFTER INSERT OR UPDATE OR DELETE ON public.orp_plan_deliverables
FOR EACH ROW EXECUTE FUNCTION public.log_orp_activity();

CREATE TRIGGER log_orp_approval_activity
AFTER INSERT OR UPDATE ON public.orp_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_orp_activity();

CREATE TRIGGER log_orp_resource_activity
AFTER INSERT OR DELETE ON public.orp_resources
FOR EACH ROW EXECUTE FUNCTION public.log_orp_activity();

CREATE TRIGGER log_orp_attachment_activity
AFTER INSERT OR DELETE ON public.orp_deliverable_attachments
FOR EACH ROW EXECUTE FUNCTION public.log_orp_activity();

CREATE TRIGGER log_orp_collaborator_activity
AFTER INSERT OR DELETE ON public.orp_collaborators
FOR EACH ROW EXECUTE FUNCTION public.log_orp_activity();

-- Enable realtime for new tables
ALTER TABLE public.orp_activity_log REPLICA IDENTITY FULL;
ALTER TABLE public.orp_templates REPLICA IDENTITY FULL;

-- Add indexes for better performance
CREATE INDEX idx_orp_activity_log_plan_id ON public.orp_activity_log(orp_plan_id);
CREATE INDEX idx_orp_activity_log_created_at ON public.orp_activity_log(created_at DESC);
CREATE INDEX idx_orp_template_deliverables_template_id ON public.orp_template_deliverables(template_id);
