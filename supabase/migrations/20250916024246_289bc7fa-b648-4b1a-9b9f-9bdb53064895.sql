-- Create checklist_categories table
CREATE TABLE public.checklist_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  display_order integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checklist_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for checklist categories
CREATE POLICY "All users can view active checklist categories" 
ON public.checklist_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage checklist categories" 
ON public.checklist_categories 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checklist_categories_updated_at
BEFORE UPDATE ON public.checklist_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the specified categories
INSERT INTO public.checklist_categories (name, display_order) VALUES
  ('General', 1),
  ('Process Safety', 2),
  ('Health & Safety', 3),
  ('Documentation', 4),
  ('Organization', 5),
  ('Emergency Response', 6),
  ('PACO', 7),
  ('Static', 8),
  ('Rotating', 9),
  ('Civil', 10),
  ('Elect', 11);