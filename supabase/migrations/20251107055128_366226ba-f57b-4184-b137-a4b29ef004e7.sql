-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pssr_updates BOOLEAN DEFAULT true,
  checklist_items BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  team_messages BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  email_digest_frequency TEXT DEFAULT 'instant' CHECK (email_digest_frequency IN ('instant', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notification preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON public.notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);