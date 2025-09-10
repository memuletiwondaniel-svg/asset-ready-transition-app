-- Create checklists table
CREATE TABLE public.checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  reason text NOT NULL,
  custom_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  selected_items text[] NOT NULL DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all checklists" 
ON public.checklists 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create checklists" 
ON public.checklists 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own checklists" 
ON public.checklists 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own checklists" 
ON public.checklists 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checklists_updated_at
BEFORE UPDATE ON public.checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create custom_reasons table to store user-defined reasons
CREATE TABLE public.custom_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reason_text text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_reasons ENABLE ROW LEVEL SECURITY;

-- Create policies for custom reasons
CREATE POLICY "All users can view custom reasons" 
ON public.custom_reasons 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create custom reasons" 
ON public.custom_reasons 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);