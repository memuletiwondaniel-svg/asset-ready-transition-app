-- Add disciplines column to pssr_walkdown_events table
ALTER TABLE public.pssr_walkdown_events
ADD COLUMN disciplines JSONB DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.pssr_walkdown_events.disciplines IS 
  'Array of discipline objects [{id, name}] for discipline-specific walkdowns';