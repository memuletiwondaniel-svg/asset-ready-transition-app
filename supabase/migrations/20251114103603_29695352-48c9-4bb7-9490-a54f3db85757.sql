-- Add two_factor_secret column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'two_factor_secret'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN two_factor_secret TEXT;
  END IF;
END $$;

-- Add backup codes column for account recovery
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'two_factor_backup_codes'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN two_factor_backup_codes TEXT[];
  END IF;
END $$;