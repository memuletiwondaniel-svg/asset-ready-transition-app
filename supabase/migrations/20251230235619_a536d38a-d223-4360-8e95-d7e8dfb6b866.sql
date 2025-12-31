-- Create checklist item approving disciplines junction table (many-to-many)
CREATE TABLE public.checklist_item_approving_disciplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id TEXT NOT NULL,
  discipline_id UUID NOT NULL REFERENCES public.discipline(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(checklist_item_id, discipline_id)
);

-- Create checklist item delivering parties table (one delivering party per checklist item)
CREATE TABLE public.checklist_item_delivering_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id TEXT NOT NULL UNIQUE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist item approval responses table (tracks approval workflow per PSSR)
CREATE TABLE public.checklist_item_approval_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  checklist_item_id TEXT NOT NULL,
  discipline_id UUID NOT NULL REFERENCES public.discipline(id) ON DELETE CASCADE,
  approver_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'approved_with_condition', 'rejected')),
  comments TEXT,
  condition_description TEXT,
  condition_target_date TIMESTAMP WITH TIME ZONE,
  condition_priority TEXT CHECK (condition_priority IN ('P1', 'P2', 'P3')),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pssr_id, checklist_item_id, discipline_id)
);

-- Create indexes for performance
CREATE INDEX idx_ciad_item ON public.checklist_item_approving_disciplines(checklist_item_id);
CREATE INDEX idx_ciad_discipline ON public.checklist_item_approving_disciplines(discipline_id);
CREATE INDEX idx_cidp_item ON public.checklist_item_delivering_parties(checklist_item_id);
CREATE INDEX idx_cidp_position ON public.checklist_item_delivering_parties(position_id);
CREATE INDEX idx_ciar_pssr ON public.checklist_item_approval_responses(pssr_id);
CREATE INDEX idx_ciar_approver ON public.checklist_item_approval_responses(approver_user_id);
CREATE INDEX idx_ciar_status ON public.checklist_item_approval_responses(status);

-- Enable RLS on all new tables
ALTER TABLE public.checklist_item_approving_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_delivering_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_item_approval_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist_item_approving_disciplines
CREATE POLICY "ciad_select_all" ON public.checklist_item_approving_disciplines FOR SELECT USING (true);
CREATE POLICY "ciad_insert_admin" ON public.checklist_item_approving_disciplines FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));
CREATE POLICY "ciad_update_admin" ON public.checklist_item_approving_disciplines FOR UPDATE USING (public.user_is_admin(auth.uid()));
CREATE POLICY "ciad_delete_admin" ON public.checklist_item_approving_disciplines FOR DELETE USING (public.user_is_admin(auth.uid()));

-- RLS policies for checklist_item_delivering_parties
CREATE POLICY "cidp_select_all" ON public.checklist_item_delivering_parties FOR SELECT USING (true);
CREATE POLICY "cidp_insert_admin" ON public.checklist_item_delivering_parties FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));
CREATE POLICY "cidp_update_admin" ON public.checklist_item_delivering_parties FOR UPDATE USING (public.user_is_admin(auth.uid()));
CREATE POLICY "cidp_delete_admin" ON public.checklist_item_delivering_parties FOR DELETE USING (public.user_is_admin(auth.uid()));

-- RLS policies for checklist_item_approval_responses
CREATE POLICY "ciar_select" ON public.checklist_item_approval_responses FOR SELECT USING (true);
CREATE POLICY "ciar_insert" ON public.checklist_item_approval_responses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ciar_update" ON public.checklist_item_approval_responses FOR UPDATE USING (approver_user_id = auth.uid() OR public.user_is_admin(auth.uid()));

-- Add missing disciplines
INSERT INTO public.discipline (name, description, is_active)
VALUES 
  ('HSE', 'Health, Safety and Environment', true),
  ('Emergency Response', 'Emergency Response Team', true),
  ('Maintenance', 'Maintenance Department', true),
  ('Technical Safety', 'Technical Safety Department', true)
ON CONFLICT DO NOTHING;

-- Add missing positions
INSERT INTO public.positions (name, department, is_active, display_order)
VALUES 
  ('Commissioning Lead', 'Operations', true, 20),
  ('Construction Lead', 'Projects', true, 21),
  ('Completions Engineer', 'Projects', true, 22),
  ('Project Engineer', 'Projects', true, 23),
  ('Site Engineer', 'Operations', true, 24),
  ('OPS Coach', 'Operations', true, 25),
  ('Deputy Plant Director', 'Management', true, 26)
ON CONFLICT DO NOTHING;

-- Create trigger function for updating updated_at columns
CREATE OR REPLACE FUNCTION public.update_checklist_item_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_ciad_updated_at
BEFORE UPDATE ON public.checklist_item_approving_disciplines
FOR EACH ROW EXECUTE FUNCTION public.update_checklist_item_config_updated_at();

CREATE TRIGGER tr_cidp_updated_at
BEFORE UPDATE ON public.checklist_item_delivering_parties
FOR EACH ROW EXECUTE FUNCTION public.update_checklist_item_config_updated_at();

CREATE TRIGGER tr_ciar_updated_at
BEFORE UPDATE ON public.checklist_item_approval_responses
FOR EACH ROW EXECUTE FUNCTION public.update_checklist_item_config_updated_at();