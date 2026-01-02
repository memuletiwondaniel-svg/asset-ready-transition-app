-- Create role_category table
CREATE TABLE public.role_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_category ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for role_category
CREATE POLICY "Anyone can view active role categories"
ON public.role_category
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage role categories"
ON public.role_category
FOR ALL
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- Add category_id to roles table
ALTER TABLE public.roles ADD COLUMN category_id UUID REFERENCES public.role_category(id);

-- Create trigger for updated_at
CREATE TRIGGER update_role_category_updated_at
  BEFORE UPDATE ON public.role_category
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 4 main categories
INSERT INTO public.role_category (name, description, display_order) VALUES
  ('Project', 'Project management and execution roles', 1),
  ('Engineering', 'Technical engineering roles', 2),
  ('Operations', 'Plant operations and maintenance roles', 3),
  ('Safety', 'Health, safety, and environment roles', 4);