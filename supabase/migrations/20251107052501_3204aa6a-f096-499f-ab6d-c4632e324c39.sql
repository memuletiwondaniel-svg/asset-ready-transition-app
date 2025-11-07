-- Create table for user dashboard widget configurations
CREATE TABLE IF NOT EXISTS public.user_widget_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  widget_type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  size TEXT NOT NULL DEFAULT 'medium',
  settings JSONB DEFAULT '{}'::jsonb,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_widget_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own widget configs"
  ON public.user_widget_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own widget configs"
  ON public.user_widget_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own widget configs"
  ON public.user_widget_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own widget configs"
  ON public.user_widget_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_user_widget_configs_user_id ON public.user_widget_configs(user_id);

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for widget configs
CREATE TRIGGER update_user_widget_configs_updated_at
  BEFORE UPDATE ON public.user_widget_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();