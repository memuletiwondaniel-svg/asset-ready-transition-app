-- Create the field table
CREATE TABLE public.field (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.field ENABLE ROW LEVEL SECURITY;

-- Create policies for field table
CREATE POLICY "All users can view active fields" 
ON public.field 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage fields" 
ON public.field 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Insert the field entries
INSERT INTO public.field (name) VALUES
  ('West Qurna (WQ1)'),
  ('North Rumaila'),
  ('South Rumaila'),
  ('Zubair');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_field_updated_at
BEFORE UPDATE ON public.field
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();