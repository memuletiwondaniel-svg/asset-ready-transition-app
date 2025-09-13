-- Create discipline table
CREATE TABLE public.discipline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the discipline entries
INSERT INTO public.discipline (name) VALUES
  ('Process'),
  ('Elect'),
  ('PACO'),
  ('Static'),
  ('Rotating'),
  ('Civil'),
  ('Tech Safety');

-- Enable RLS
ALTER TABLE public.discipline ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All users can view active disciplines" 
ON public.discipline 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage disciplines" 
ON public.discipline 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_discipline_updated_at
BEFORE UPDATE ON public.discipline
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();