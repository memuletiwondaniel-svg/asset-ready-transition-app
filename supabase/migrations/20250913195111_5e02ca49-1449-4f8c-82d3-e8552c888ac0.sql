-- Create hubs table
CREATE TABLE public.hubs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

-- Create policies for hubs table (following same pattern as other lookup tables)
CREATE POLICY "Admin users can manage hubs" 
ON public.hubs 
FOR ALL 
USING (user_is_admin(auth.uid()));

CREATE POLICY "All users can view active hubs" 
ON public.hubs 
FOR SELECT 
USING (is_active = true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_hubs_updated_at
BEFORE UPDATE ON public.hubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the hub entries
INSERT INTO public.hubs (name) VALUES
  ('North'),
  ('Central'),
  ('South'),
  ('Pipelines'),
  ('NRNGL'),
  ('KAZ'),
  ('Zubair'),
  ('UQ'),
  ('West Qurna');