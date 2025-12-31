-- Create checklist categories table
CREATE TABLE public.pssr_checklist_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  ref_id TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist topics table
CREATE TABLE public.pssr_checklist_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist items table
CREATE TABLE public.pssr_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_id TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES public.pssr_checklist_categories(id) ON DELETE RESTRICT,
  topic_id UUID REFERENCES public.pssr_checklist_topics(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  supporting_evidence TEXT,
  approving_authority TEXT,
  responsible_party TEXT,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.pssr_checklist_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_checklist_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pssr_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Anyone can view active checklist categories" 
ON public.pssr_checklist_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage checklist categories" 
ON public.pssr_checklist_categories 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for topics
CREATE POLICY "Anyone can view active checklist topics" 
ON public.pssr_checklist_topics 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage checklist topics" 
ON public.pssr_checklist_topics 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- RLS Policies for items
CREATE POLICY "Anyone can view active checklist items" 
ON public.pssr_checklist_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage checklist items" 
ON public.pssr_checklist_items 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_pssr_checklist_items_category ON public.pssr_checklist_items(category_id);
CREATE INDEX idx_pssr_checklist_items_topic ON public.pssr_checklist_items(topic_id);
CREATE INDEX idx_pssr_checklist_items_unique_id ON public.pssr_checklist_items(unique_id);

-- Seed categories
INSERT INTO public.pssr_checklist_categories (name, ref_id, display_order) VALUES
('General', 'GN', 1),
('Technical Integrity', 'TI', 2),
('Start-Up Readiness', 'SR', 3),
('Health & Safety', 'HS', 4),
('Environmental', 'EN', 5);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_pssr_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_pssr_checklist_categories_updated_at
BEFORE UPDATE ON public.pssr_checklist_categories
FOR EACH ROW EXECUTE FUNCTION public.update_pssr_checklist_updated_at();

CREATE TRIGGER update_pssr_checklist_topics_updated_at
BEFORE UPDATE ON public.pssr_checklist_topics
FOR EACH ROW EXECUTE FUNCTION public.update_pssr_checklist_updated_at();

CREATE TRIGGER update_pssr_checklist_items_updated_at
BEFORE UPDATE ON public.pssr_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_pssr_checklist_updated_at();