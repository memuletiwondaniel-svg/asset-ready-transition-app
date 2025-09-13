-- Create the commission table
CREATE TABLE public.commission (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.commission ENABLE ROW LEVEL SECURITY;

-- Create policies for commission table
CREATE POLICY "All users can view active commissions" 
ON public.commission 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage commissions" 
ON public.commission 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Insert the commission entries
INSERT INTO public.commission (name) VALUES
  ('P&E'),
  ('Asset');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_commission_updated_at
BEFORE UPDATE ON public.commission
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();