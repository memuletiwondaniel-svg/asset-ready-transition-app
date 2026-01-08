-- Create enum for item approval status
CREATE TYPE pssr_item_approval_status AS ENUM ('pending', 'ready_for_review', 'approved', 'rejected', 'approved_with_action');

-- Create enum for priority action priority level
CREATE TYPE pssr_priority_level AS ENUM ('A', 'B');

-- Create enum for priority action status
CREATE TYPE pssr_action_status AS ENUM ('open', 'in_progress', 'closed');

-- Create pssr_item_approvals table
CREATE TABLE public.pssr_item_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  checklist_response_id UUID NOT NULL REFERENCES public.pssr_checklist_responses(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL,
  approver_user_id UUID REFERENCES auth.users(id),
  status pssr_item_approval_status NOT NULL DEFAULT 'pending',
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checklist_response_id, approver_role)
);

-- Create pssr_priority_actions table
CREATE TABLE public.pssr_priority_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  item_approval_id UUID NOT NULL REFERENCES public.pssr_item_approvals(id) ON DELETE CASCADE,
  priority pssr_priority_level NOT NULL,
  description TEXT NOT NULL,
  action_owner_id UUID REFERENCES public.profiles(user_id),
  action_owner_name TEXT,
  target_date DATE,
  status pssr_action_status NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pssr_discipline_reviews table for tracking discipline-level completion
CREATE TABLE public.pssr_discipline_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  discipline_role TEXT NOT NULL,
  reviewer_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  discipline_comment TEXT,
  items_total INTEGER DEFAULT 0,
  items_reviewed INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pssr_id, discipline_role)
);

-- Enable RLS
ALTER TABLE public.pssr_item_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_priority_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_discipline_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pssr_item_approvals - using simple authenticated check
CREATE POLICY "Authenticated users can view item approvals"
ON public.pssr_item_approvals FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Approvers can update their own item approvals"
ON public.pssr_item_approvals FOR UPDATE
USING (approver_user_id = auth.uid() OR user_is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert item approvals"
ON public.pssr_item_approvals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete item approvals"
ON public.pssr_item_approvals FOR DELETE
USING (user_is_admin(auth.uid()));

-- RLS Policies for pssr_priority_actions
CREATE POLICY "Authenticated users can view priority actions"
ON public.pssr_priority_actions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert priority actions"
ON public.pssr_priority_actions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update priority actions they own or created"
ON public.pssr_priority_actions FOR UPDATE
USING (
  action_owner_id = auth.uid() 
  OR created_by = auth.uid() 
  OR user_is_admin(auth.uid())
);

CREATE POLICY "Admins can delete priority actions"
ON public.pssr_priority_actions FOR DELETE
USING (user_is_admin(auth.uid()));

-- RLS Policies for pssr_discipline_reviews
CREATE POLICY "Authenticated users can view discipline reviews"
ON public.pssr_discipline_reviews FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Reviewers can update their own discipline reviews"
ON public.pssr_discipline_reviews FOR UPDATE
USING (reviewer_user_id = auth.uid() OR user_is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert discipline reviews"
ON public.pssr_discipline_reviews FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_pssr_item_approvals_pssr_id ON public.pssr_item_approvals(pssr_id);
CREATE INDEX idx_pssr_item_approvals_approver_role ON public.pssr_item_approvals(approver_role);
CREATE INDEX idx_pssr_item_approvals_approver_user_id ON public.pssr_item_approvals(approver_user_id);
CREATE INDEX idx_pssr_item_approvals_status ON public.pssr_item_approvals(status);
CREATE INDEX idx_pssr_priority_actions_pssr_id ON public.pssr_priority_actions(pssr_id);
CREATE INDEX idx_pssr_priority_actions_status ON public.pssr_priority_actions(status);
CREATE INDEX idx_pssr_priority_actions_priority ON public.pssr_priority_actions(priority);
CREATE INDEX idx_pssr_discipline_reviews_pssr_id ON public.pssr_discipline_reviews(pssr_id);
CREATE INDEX idx_pssr_discipline_reviews_reviewer ON public.pssr_discipline_reviews(reviewer_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_pssr_item_approvals_updated_at
  BEFORE UPDATE ON public.pssr_item_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_priority_actions_updated_at
  BEFORE UPDATE ON public.pssr_priority_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_discipline_reviews_updated_at
  BEFORE UPDATE ON public.pssr_discipline_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();