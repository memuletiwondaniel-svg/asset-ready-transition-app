
-- Table: agent_competency_areas
CREATE TABLE public.agent_competency_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code text NOT NULL,
  name text NOT NULL,
  description text,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'not_started',
  source text NOT NULL DEFAULT 'seeded',
  ai_assessment_notes text,
  linked_session_ids uuid[] DEFAULT '{}',
  last_assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_competency_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competency areas"
  ON public.agent_competency_areas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert competency areas"
  ON public.agent_competency_areas FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin((select auth.uid())));

CREATE POLICY "Admins can update competency areas"
  ON public.agent_competency_areas FOR UPDATE TO authenticated
  USING (public.user_is_admin((select auth.uid())));

CREATE POLICY "Admins can delete competency areas"
  ON public.agent_competency_areas FOR DELETE TO authenticated
  USING (public.user_is_admin((select auth.uid())));

CREATE INDEX idx_competency_areas_agent ON public.agent_competency_areas(agent_code);

-- Table: agent_competency_updates
CREATE TABLE public.agent_competency_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES public.agent_competency_areas(id) ON DELETE CASCADE,
  session_id uuid,
  trigger_type text NOT NULL,
  previous_progress integer,
  new_progress integer,
  assessment_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_competency_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competency updates"
  ON public.agent_competency_updates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert competency updates"
  ON public.agent_competency_updates FOR INSERT TO authenticated
  WITH CHECK (public.user_is_admin((select auth.uid())));

CREATE POLICY "Admins can update competency updates"
  ON public.agent_competency_updates FOR UPDATE TO authenticated
  USING (public.user_is_admin((select auth.uid())));

CREATE POLICY "Admins can delete competency updates"
  ON public.agent_competency_updates FOR DELETE TO authenticated
  USING (public.user_is_admin((select auth.uid())));

CREATE INDEX idx_competency_updates_competency ON public.agent_competency_updates(competency_id);
CREATE INDEX idx_competency_updates_session ON public.agent_competency_updates(session_id);

-- Timestamp trigger for agent_competency_areas
CREATE TRIGGER update_agent_competency_areas_updated_at
  BEFORE UPDATE ON public.agent_competency_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
