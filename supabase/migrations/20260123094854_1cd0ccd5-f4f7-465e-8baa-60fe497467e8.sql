-- Create pssr_walkdown_events table to track scheduled walkdowns
CREATE TABLE public.pssr_walkdown_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  location TEXT,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  attendees JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create pssr_walkdown_observations table to capture findings during walkdown
CREATE TABLE public.pssr_walkdown_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walkdown_event_id UUID NOT NULL REFERENCES public.pssr_walkdown_events(id) ON DELETE CASCADE,
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('finding', 'action_required', 'note')),
  category TEXT,
  description TEXT NOT NULL,
  location_details TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  priority TEXT CHECK (priority IN ('A', 'B')),
  linked_priority_action_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add source tracking columns to pssr_priority_actions
ALTER TABLE public.pssr_priority_actions 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'checklist_review' CHECK (source_type IN ('checklist_review', 'walkdown')),
ADD COLUMN IF NOT EXISTS walkdown_observation_id UUID;

-- Add foreign key constraint after both tables exist
ALTER TABLE public.pssr_walkdown_observations
ADD CONSTRAINT fk_linked_priority_action
FOREIGN KEY (linked_priority_action_id) REFERENCES public.pssr_priority_actions(id) ON DELETE SET NULL;

ALTER TABLE public.pssr_priority_actions
ADD CONSTRAINT fk_walkdown_observation
FOREIGN KEY (walkdown_observation_id) REFERENCES public.pssr_walkdown_observations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.pssr_walkdown_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_walkdown_observations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pssr_walkdown_events
CREATE POLICY "Users can view walkdown events for their PSSRs"
ON public.pssr_walkdown_events FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create walkdown events"
ON public.pssr_walkdown_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update walkdown events"
ON public.pssr_walkdown_events FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete walkdown events they created"
ON public.pssr_walkdown_events FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for pssr_walkdown_observations
CREATE POLICY "Users can view walkdown observations"
ON public.pssr_walkdown_observations FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create observations"
ON public.pssr_walkdown_observations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update observations"
ON public.pssr_walkdown_observations FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete observations they created"
ON public.pssr_walkdown_observations FOR DELETE
USING (auth.uid() = created_by);

-- Create indexes for better query performance
CREATE INDEX idx_walkdown_events_pssr_id ON public.pssr_walkdown_events(pssr_id);
CREATE INDEX idx_walkdown_events_status ON public.pssr_walkdown_events(status);
CREATE INDEX idx_walkdown_observations_event_id ON public.pssr_walkdown_observations(walkdown_event_id);
CREATE INDEX idx_walkdown_observations_pssr_id ON public.pssr_walkdown_observations(pssr_id);
CREATE INDEX idx_walkdown_observations_priority ON public.pssr_walkdown_observations(priority);
CREATE INDEX idx_priority_actions_source ON public.pssr_priority_actions(source_type);

-- Trigger for updated_at
CREATE TRIGGER update_walkdown_events_updated_at
BEFORE UPDATE ON public.pssr_walkdown_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_walkdown_observations_updated_at
BEFORE UPDATE ON public.pssr_walkdown_observations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();