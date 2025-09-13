-- Create the roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create policies for roles table
CREATE POLICY "All users can view active roles" 
ON public.roles 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage roles" 
ON public.roles 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Insert the role entries
INSERT INTO public.roles (name) VALUES
  ('HSE Director'),
  ('P&E Director'),
  ('Prod. Director'),
  ('Proj Manager'),
  ('Commissioning Lead'),
  ('Construction Lead'),
  ('Deputy Plant Director'),
  ('Plant Director'),
  ('Site Engineer'),
  ('ORA Engineer'),
  ('Engr. Manager'),
  ('Tech. Authority (TA2)'),
  ('Ops Coach'),
  ('Proj Engr'),
  ('ER Lead'),
  ('OPS HSE Lead'),
  ('Proj HSE Lead');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();