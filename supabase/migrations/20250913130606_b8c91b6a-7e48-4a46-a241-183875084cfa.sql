-- Create the plant table
CREATE TABLE public.plant (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.plant ENABLE ROW LEVEL SECURITY;

-- Create policies for plant table
CREATE POLICY "All users can view active plants" 
ON public.plant 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage plants" 
ON public.plant 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Insert the plant entries
INSERT INTO public.plant (name) VALUES
  ('UQ'),
  ('KAZ'),
  ('CS'),
  ('BNGL'),
  ('NRNGL');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_plant_updated_at
BEFORE UPDATE ON public.plant
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();