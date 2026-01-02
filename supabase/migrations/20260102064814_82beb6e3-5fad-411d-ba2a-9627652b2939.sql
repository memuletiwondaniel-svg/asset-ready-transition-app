-- Drop topic_id column since topic (text) already exists
ALTER TABLE public.pssr_checklist_items DROP COLUMN IF EXISTS topic_id;