-- Create widget_layout_presets table
CREATE TABLE public.widget_layout_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  preset_type TEXT NOT NULL DEFAULT 'custom',
  is_default BOOLEAN DEFAULT false,
  layout_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_layout_presets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own presets"
ON public.widget_layout_presets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets"
ON public.widget_layout_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
ON public.widget_layout_presets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
ON public.widget_layout_presets
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_widget_layout_presets_user_id ON public.widget_layout_presets(user_id);
CREATE INDEX idx_widget_layout_presets_preset_type ON public.widget_layout_presets(preset_type);

-- Add trigger for updated_at
CREATE TRIGGER update_widget_layout_presets_updated_at
BEFORE UPDATE ON public.widget_layout_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();