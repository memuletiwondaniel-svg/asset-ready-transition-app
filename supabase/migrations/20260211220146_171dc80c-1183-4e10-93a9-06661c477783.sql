
-- Create VCR Item Category table
CREATE TABLE public.vcr_item_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vcr_item_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Authenticated users can read VCR item categories"
ON public.vcr_item_categories
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert VCR item categories"
ON public.vcr_item_categories
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can update VCR item categories"
ON public.vcr_item_categories
FOR UPDATE
TO authenticated
USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete VCR item categories"
ON public.vcr_item_categories
FOR DELETE
TO authenticated
USING (public.user_is_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_vcr_item_categories_updated_at
BEFORE UPDATE ON public.vcr_item_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Populate with initial data
INSERT INTO public.vcr_item_categories (code, name, description, display_order) VALUES
  ('DI', 'Design Integrity', NULL, 1),
  ('TI', 'Technical Integrity', NULL, 2),
  ('OI', 'Operating Integrity', NULL, 3),
  ('MS', 'Management Systems', NULL, 4),
  ('HS', 'Health & Safety', NULL, 5);
