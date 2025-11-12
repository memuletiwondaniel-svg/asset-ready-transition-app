-- Create P2A approval stages enum
CREATE TYPE public.p2a_approval_stage AS ENUM (
  'PROJECT_TEAM_REVIEW',
  'ASSET_TEAM_REVIEW', 
  'OPERATIONS_MANAGER_APPROVAL',
  'FINAL_SIGNOFF'
);

-- Create P2A approval status enum
CREATE TYPE public.p2a_approval_status AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED');

-- Create P2A approval workflow table
CREATE TABLE public.p2a_approval_workflow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  stage public.p2a_approval_stage NOT NULL,
  status public.p2a_approval_status NOT NULL DEFAULT 'PENDING',
  approver_user_id UUID,
  approver_name TEXT NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create P2A notifications table
CREATE TABLE public.p2a_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_id UUID NOT NULL REFERENCES public.p2a_handovers(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL,
  sender_user_id UUID,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2a_approval_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2a_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for p2a_approval_workflow
CREATE POLICY "Users can view approval workflows"
ON public.p2a_approval_workflow FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.p2a_handovers 
  WHERE id = p2a_approval_workflow.handover_id AND is_active = true
));

CREATE POLICY "Users can update approval workflows"
ON public.p2a_approval_workflow FOR UPDATE
USING (
  auth.uid() = approver_user_id 
  OR EXISTS (
    SELECT 1 FROM public.p2a_handovers 
    WHERE id = p2a_approval_workflow.handover_id AND created_by = auth.uid()
  )
  OR user_is_admin(auth.uid())
);

CREATE POLICY "Admins can manage approval workflows"
ON public.p2a_approval_workflow FOR ALL
USING (user_is_admin(auth.uid()));

-- RLS Policies for p2a_notifications
CREATE POLICY "Users can view their own notifications"
ON public.p2a_notifications FOR SELECT
USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can create notifications"
ON public.p2a_notifications FOR INSERT
WITH CHECK (auth.uid() = sender_user_id OR user_is_admin(auth.uid()));

CREATE POLICY "Users can update their own notifications"
ON public.p2a_notifications FOR UPDATE
USING (auth.uid() = recipient_user_id);

-- Triggers
CREATE TRIGGER update_p2a_approval_workflow_updated_at
BEFORE UPDATE ON public.p2a_approval_workflow
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize approval workflow when handover is created
CREATE OR REPLACE FUNCTION public.initialize_p2a_approval_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default approval stages
  INSERT INTO public.p2a_approval_workflow (handover_id, stage, approver_name, status)
  VALUES 
    (NEW.id, 'PROJECT_TEAM_REVIEW', 'Project Team Lead', 'PENDING'),
    (NEW.id, 'ASSET_TEAM_REVIEW', 'Asset Team Lead', 'PENDING'),
    (NEW.id, 'OPERATIONS_MANAGER_APPROVAL', 'Operations Manager', 'PENDING'),
    (NEW.id, 'FINAL_SIGNOFF', 'Director', 'PENDING');
  
  RETURN NEW;
END;
$$;

-- Create trigger to initialize workflow
CREATE TRIGGER initialize_p2a_workflow_on_handover_create
AFTER INSERT ON public.p2a_handovers
FOR EACH ROW
EXECUTE FUNCTION public.initialize_p2a_approval_workflow();