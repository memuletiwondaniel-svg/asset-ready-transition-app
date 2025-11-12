-- Create audit trail table for P2A tracking
CREATE TABLE IF NOT EXISTS public.p2a_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'DELIVERABLE_CREATED', 'DELIVERABLE_UPDATED', 'STATUS_CHANGED', 'APPROVAL_UPDATED', 'FILE_UPLOADED', 'FILE_DELETED'
  entity_type TEXT NOT NULL, -- 'DELIVERABLE', 'APPROVAL', 'ATTACHMENT', 'HANDOVER'
  entity_id UUID, -- Reference to the specific entity
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_p2a_audit_trail_handover ON public.p2a_audit_trail(handover_id);
CREATE INDEX idx_p2a_audit_trail_created_at ON public.p2a_audit_trail(created_at DESC);
CREATE INDEX idx_p2a_audit_trail_user ON public.p2a_audit_trail(user_id);

-- Enable RLS
ALTER TABLE public.p2a_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view audit trail for handovers they have access to"
  ON public.p2a_audit_trail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.p2a_handovers
      WHERE p2a_handovers.id = p2a_audit_trail.handover_id
      AND p2a_handovers.is_active = true
    )
  );

CREATE POLICY "System can create audit trail entries"
  ON public.p2a_audit_trail FOR INSERT
  WITH CHECK (true);

-- Function to log audit trail
CREATE OR REPLACE FUNCTION public.log_p2a_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  handover_uuid UUID;
  action_description TEXT;
BEGIN
  -- Determine handover_id based on table
  IF TG_TABLE_NAME = 'p2a_handovers' THEN
    handover_uuid := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'p2a_handover_deliverables' THEN
    handover_uuid := COALESCE(NEW.handover_id, OLD.handover_id);
  ELSIF TG_TABLE_NAME = 'p2a_approval_workflow' THEN
    handover_uuid := COALESCE(NEW.handover_id, OLD.handover_id);
  ELSIF TG_TABLE_NAME = 'p2a_deliverable_attachments' THEN
    SELECT handover_id INTO handover_uuid
    FROM public.p2a_handover_deliverables
    WHERE id = COALESCE(NEW.deliverable_id, OLD.deliverable_id);
  END IF;

  -- Build description
  IF TG_OP = 'INSERT' THEN
    action_description := 'Created ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'UPDATE' THEN
    action_description := 'Updated ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    action_description := 'Deleted ' || TG_TABLE_NAME;
  END IF;

  -- Insert audit record
  INSERT INTO public.p2a_audit_trail (
    handover_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    old_values,
    new_values,
    description
  ) VALUES (
    handover_uuid,
    auth.uid(),
    TG_OP || '_' || UPPER(TG_TABLE_NAME),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    action_description
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit trail
CREATE TRIGGER audit_p2a_handovers
  AFTER INSERT OR UPDATE OR DELETE ON public.p2a_handovers
  FOR EACH ROW EXECUTE FUNCTION public.log_p2a_audit_trail();

CREATE TRIGGER audit_p2a_handover_deliverables
  AFTER INSERT OR UPDATE OR DELETE ON public.p2a_handover_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.log_p2a_audit_trail();

CREATE TRIGGER audit_p2a_approval_workflow
  AFTER INSERT OR UPDATE OR DELETE ON public.p2a_approval_workflow
  FOR EACH ROW EXECUTE FUNCTION public.log_p2a_audit_trail();

CREATE TRIGGER audit_p2a_deliverable_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.p2a_deliverable_attachments
  FOR EACH ROW EXECUTE FUNCTION public.log_p2a_audit_trail();