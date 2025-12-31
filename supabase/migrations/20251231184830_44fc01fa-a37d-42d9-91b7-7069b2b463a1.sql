-- Add description column to pssr_reasons table
ALTER TABLE pssr_reasons 
ADD COLUMN IF NOT EXISTS description TEXT;