-- Clear all position values from profiles
UPDATE public.profiles SET "position" = NULL WHERE "position" IS NOT NULL;