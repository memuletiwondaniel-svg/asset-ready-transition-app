-- Create pssr_walkdown_attendees table for normalized attendee tracking with RSVP
CREATE TABLE public.pssr_walkdown_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walkdown_event_id UUID NOT NULL REFERENCES public.pssr_walkdown_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'tentative')),
  response_time TIMESTAMPTZ,
  source TEXT DEFAULT 'checklist' CHECK (source IN ('checklist', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(walkdown_event_id, email)
);

-- Add Outlook event tracking columns to pssr_walkdown_events
ALTER TABLE public.pssr_walkdown_events
ADD COLUMN IF NOT EXISTS outlook_event_id TEXT,
ADD COLUMN IF NOT EXISTS outlook_ical_uid TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create microsoft_oauth_tokens table for storing user OAuth tokens
CREATE TABLE public.microsoft_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.pssr_walkdown_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microsoft_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for pssr_walkdown_attendees
CREATE POLICY "Users can view walkdown attendees" 
ON public.pssr_walkdown_attendees 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert walkdown attendees" 
ON public.pssr_walkdown_attendees 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update walkdown attendees" 
ON public.pssr_walkdown_attendees 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete walkdown attendees" 
ON public.pssr_walkdown_attendees 
FOR DELETE 
USING (true);

-- RLS policies for microsoft_oauth_tokens (users can only access their own tokens)
CREATE POLICY "Users can view their own tokens" 
ON public.microsoft_oauth_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
ON public.microsoft_oauth_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON public.microsoft_oauth_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
ON public.microsoft_oauth_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at on pssr_walkdown_attendees
CREATE TRIGGER update_pssr_walkdown_attendees_updated_at
BEFORE UPDATE ON public.pssr_walkdown_attendees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on microsoft_oauth_tokens
CREATE TRIGGER update_microsoft_oauth_tokens_updated_at
BEFORE UPDATE ON public.microsoft_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_walkdown_attendees_event_id ON public.pssr_walkdown_attendees(walkdown_event_id);
CREATE INDEX idx_walkdown_attendees_email ON public.pssr_walkdown_attendees(email);
CREATE INDEX idx_walkdown_attendees_rsvp ON public.pssr_walkdown_attendees(rsvp_status);
CREATE INDEX idx_walkdown_events_outlook_id ON public.pssr_walkdown_events(outlook_event_id) WHERE outlook_event_id IS NOT NULL;
CREATE INDEX idx_microsoft_oauth_user ON public.microsoft_oauth_tokens(user_id);