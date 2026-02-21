
-- Table: pssr_key_activities
-- Tracks schedulable PSSR activities (Kick-off, Walkdown, SoF Meeting, custom)
CREATE TABLE public.pssr_key_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pssr_id UUID NOT NULL REFERENCES public.pssrs(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'kickoff', 'walkdown', 'sof_meeting', or custom
  label TEXT NOT NULL, -- Display name e.g. 'PSSR Kick-off'
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_scheduled', -- 'not_scheduled', 'scheduled', 'completed', 'cancelled'
  scheduled_date TIMESTAMPTZ,
  scheduled_end_date TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  outlook_event_id TEXT, -- Outlook calendar event ID if sent via Outlook
  scheduled_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  task_id UUID, -- Reference to the user_tasks entry for this activity
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pssr_key_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view activities for PSSRs they have access to"
  ON public.pssr_key_activities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert activities"
  ON public.pssr_key_activities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update activities"
  ON public.pssr_key_activities FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete activities"
  ON public.pssr_key_activities FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_pssr_key_activities_updated_at
  BEFORE UPDATE ON public.pssr_key_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_pssr_key_activities_pssr_id ON public.pssr_key_activities(pssr_id);
