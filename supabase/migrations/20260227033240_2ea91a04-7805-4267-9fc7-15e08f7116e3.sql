
-- Create the ora_plan_activities table for dynamic hierarchical activity tracking
CREATE TABLE public.ora_plan_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orp_plan_id UUID NOT NULL REFERENCES public.orp_plans(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.ora_plan_activities(id) ON DELETE CASCADE,
  activity_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_ref_id UUID,
  source_ref_table TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  completion_percentage INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  assigned_to UUID REFERENCES public.profiles(user_id),
  task_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast hierarchy traversal
CREATE INDEX idx_ora_plan_activities_parent ON public.ora_plan_activities(parent_id);
CREATE INDEX idx_ora_plan_activities_plan ON public.ora_plan_activities(orp_plan_id);
CREATE INDEX idx_ora_plan_activities_source ON public.ora_plan_activities(source_type, source_ref_id);

-- Enable RLS
ALTER TABLE public.ora_plan_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view plan activities" ON public.ora_plan_activities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert plan activities" ON public.ora_plan_activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update plan activities" ON public.ora_plan_activities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete plan activities" ON public.ora_plan_activities
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at trigger
CREATE TRIGGER update_ora_plan_activities_updated_at
  BEFORE UPDATE ON public.ora_plan_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Recursive rollup function: when a child activity is completed, recalculate parent completion
CREATE OR REPLACE FUNCTION public.rollup_ora_plan_activity_completion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_id UUID;
  v_total INTEGER;
  v_completed INTEGER;
  v_pct INTEGER;
BEGIN
  v_parent_id := COALESCE(NEW.parent_id, OLD.parent_id);
  IF v_parent_id IS NULL THEN RETURN NEW; END IF;

  -- Count children and completed children
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'COMPLETED')
  INTO v_total, v_completed
  FROM public.ora_plan_activities
  WHERE parent_id = v_parent_id;

  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100) ELSE 0 END;

  -- Update parent
  UPDATE public.ora_plan_activities
  SET completion_percentage = v_pct,
      status = CASE
        WHEN v_pct = 100 THEN 'COMPLETED'
        WHEN v_pct > 0 THEN 'IN_PROGRESS'
        ELSE 'NOT_STARTED'
      END,
      updated_at = now()
  WHERE id = v_parent_id;

  RETURN NEW;
END;
$function$;

-- Trigger rollup on status/completion changes
CREATE TRIGGER trg_rollup_ora_plan_activity
  AFTER UPDATE OF status, completion_percentage ON public.ora_plan_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.rollup_ora_plan_activity_completion();
