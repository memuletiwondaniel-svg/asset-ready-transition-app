
-- Add system_ids array column to p2a_vcr_training to store linked system IDs
ALTER TABLE public.p2a_vcr_training
ADD COLUMN IF NOT EXISTS system_ids uuid[] DEFAULT '{}';
