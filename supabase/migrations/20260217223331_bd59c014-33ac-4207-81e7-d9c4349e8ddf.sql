-- Add delivery_method column to ora_training_items for storing training delivery modes
-- Values can include: 'Onsite', 'Offsite (Out-of-Country)', 'Online'
ALTER TABLE public.ora_training_items
ADD COLUMN delivery_method text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.ora_training_items.delivery_method IS 'Training delivery methods: Onsite, Offsite (Out-of-Country), Online';