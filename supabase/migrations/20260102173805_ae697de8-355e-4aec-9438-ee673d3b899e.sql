-- Add a JSONB column to store checklist item overrides per PSSR reason
-- This stores custom attributes for each checklist item that override the library defaults
-- Format: { "item_id": { "topic": "custom topic", "description": "custom desc", ... }, ... }
ALTER TABLE public.pssr_reason_configuration 
ADD COLUMN IF NOT EXISTS checklist_item_overrides JSONB DEFAULT '{}'::jsonb;