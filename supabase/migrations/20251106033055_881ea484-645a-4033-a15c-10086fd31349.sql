-- Create checklist templates table
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create checklist template items table (stores the items that belong to a template)
CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  unique_id TEXT,
  category TEXT,
  topic TEXT,
  description TEXT,
  Approver TEXT,
  responsible TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create filter presets table
CREATE TABLE IF NOT EXISTS public.checklist_filter_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_filter_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_templates
CREATE POLICY "Users can view all templates"
ON public.checklist_templates
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own templates"
ON public.checklist_templates
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
ON public.checklist_templates
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
ON public.checklist_templates
FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for checklist_template_items
CREATE POLICY "Users can view all template items"
ON public.checklist_template_items
FOR SELECT
USING (true);

CREATE POLICY "Users can create template items for their templates"
ON public.checklist_template_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE id = template_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can update their template items"
ON public.checklist_template_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE id = template_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete their template items"
ON public.checklist_template_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE id = template_id AND created_by = auth.uid()
  )
);

-- RLS Policies for checklist_filter_presets
CREATE POLICY "Users can view their own filter presets"
ON public.checklist_filter_presets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own filter presets"
ON public.checklist_filter_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter presets"
ON public.checklist_filter_presets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter presets"
ON public.checklist_filter_presets
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_checklist_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_checklist_template_updated_at();

CREATE TRIGGER update_filter_presets_updated_at
BEFORE UPDATE ON public.checklist_filter_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_checklist_template_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_checklist_templates_created_by ON public.checklist_templates(created_by);
CREATE INDEX idx_checklist_template_items_template_id ON public.checklist_template_items(template_id);
CREATE INDEX idx_checklist_filter_presets_user_id ON public.checklist_filter_presets(user_id);