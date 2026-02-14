-- Drop the old check constraint
ALTER TABLE public.pssr_reasons DROP CONSTRAINT pssr_reasons_status_check;

-- Add updated check constraint that matches the application's status values
ALTER TABLE public.pssr_reasons ADD CONSTRAINT pssr_reasons_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text]));

-- Update any existing rows with old status values to new ones
UPDATE public.pssr_reasons SET status = 'active' WHERE status IN ('approved', 'in_use');
UPDATE public.pssr_reasons SET status = 'inactive' WHERE status = 'awaiting_approval';