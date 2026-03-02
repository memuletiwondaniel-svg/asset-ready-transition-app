-- Reassign Bart Den Hond and Scott MacLean to PACO TA2 - Asset
UPDATE public.profiles 
SET role = (SELECT id FROM public.roles WHERE name = 'PACO TA2 - Asset' LIMIT 1),
    updated_at = now()
WHERE user_id IN (
  'e2ff0461-4743-4367-a516-848ed108a840',  -- Bart Den Hond
  'f32bc5e8-bf17-45c4-bd3a-bcfe32fcaf2c'   -- Scott MacLean
);