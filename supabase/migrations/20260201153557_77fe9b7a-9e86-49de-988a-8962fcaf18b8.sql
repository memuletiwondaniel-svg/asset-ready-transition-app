-- Add is_director column to roles table
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS is_director BOOLEAN DEFAULT false;

-- Update existing director roles
UPDATE public.roles 
SET is_director = true 
WHERE name ILIKE '%Director%';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_is_director ON public.roles(is_director) WHERE is_director = true;

-- Comment for documentation
COMMENT ON COLUMN public.roles.is_director IS 'Flag to identify director-level roles who see simplified SoF-only view';