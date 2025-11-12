-- Create ORP milestones table
CREATE TABLE IF NOT EXISTS public.orp_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  linked_deliverables UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX idx_orp_milestones_plan ON public.orp_milestones(orp_plan_id);

-- Create ORP risks table
CREATE TABLE IF NOT EXISTS public.orp_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('TECHNICAL', 'SCHEDULE', 'RESOURCE', 'BUDGET', 'SAFETY', 'QUALITY', 'OTHER')),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  probability TEXT NOT NULL CHECK (probability IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MONITORING', 'MITIGATED', 'CLOSED')),
  mitigation_plan TEXT,
  owner_user_id UUID,
  identified_date DATE DEFAULT CURRENT_DATE,
  target_resolution_date DATE,
  actual_resolution_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_orp_risks_plan ON public.orp_risks(orp_plan_id);
CREATE INDEX idx_orp_risks_severity ON public.orp_risks(severity);
CREATE INDEX idx_orp_risks_status ON public.orp_risks(status);

-- Enable RLS
ALTER TABLE public.orp_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orp_risks ENABLE ROW LEVEL SECURITY;

-- RLS policies for milestones
CREATE POLICY "Users can view milestones for their ORPs"
  ON public.orp_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_plans p
      WHERE p.id = orp_milestones.orp_plan_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can manage milestones for their ORPs"
  ON public.orp_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_plans p
      WHERE p.id = orp_milestones.orp_plan_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
    )
  );

-- RLS policies for risks
CREATE POLICY "Users can view risks for their ORPs"
  ON public.orp_risks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_plans p
      WHERE p.id = orp_risks.orp_plan_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid() OR user_is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can create risks for their ORPs"
  ON public.orp_risks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.orp_plans p
      WHERE p.id = orp_risks.orp_plan_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can update risks for their ORPs"
  ON public.orp_risks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orp_plans p
      WHERE p.id = orp_risks.orp_plan_id
      AND (p.created_by = auth.uid() OR p.ora_engineer_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete risks they created"
  ON public.orp_risks FOR DELETE
  USING (auth.uid() = created_by);

-- Triggers for updated_at
CREATE TRIGGER update_orp_milestones_updated_at
  BEFORE UPDATE ON public.orp_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orp_risks_updated_at
  BEFORE UPDATE ON public.orp_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orp_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orp_risks;

-- Set replica identity
ALTER TABLE public.orp_milestones REPLICA IDENTITY FULL;
ALTER TABLE public.orp_risks REPLICA IDENTITY FULL;

-- Function to auto-calculate milestone progress
CREATE OR REPLACE FUNCTION public.calculate_milestone_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate progress based on linked deliverables
  IF array_length(NEW.linked_deliverables, 1) > 0 THEN
    SELECT COALESCE(AVG(completion_percentage), 0)::INTEGER
    INTO NEW.progress_percentage
    FROM public.orp_plan_deliverables
    WHERE id = ANY(NEW.linked_deliverables);
    
    -- Update status based on progress
    IF NEW.progress_percentage = 100 THEN
      NEW.status := 'COMPLETED';
      NEW.completion_date := CURRENT_DATE;
    ELSIF NEW.progress_percentage > 0 THEN
      NEW.status := 'IN_PROGRESS';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for milestone progress calculation
CREATE TRIGGER calculate_milestone_progress_trigger
  BEFORE INSERT OR UPDATE ON public.orp_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_milestone_progress();