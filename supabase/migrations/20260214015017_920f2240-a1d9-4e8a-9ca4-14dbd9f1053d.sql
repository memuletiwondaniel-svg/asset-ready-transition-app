-- Mark Daniel's Hydrocarbon and Non-Hydrocarbon tasks as auto_completed
-- since Roaa was the one who actually approved these, not Daniel
UPDATE public.user_tasks
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"auto_completed": true}'::jsonb
WHERE id IN (
  'f701e5e2-e1c8-4230-bc9f-9f2e146bfb4b',  -- Non-Hydrocarbon Systems
  '2a5c59c8-f7d3-4b80-942f-7926af1b02a2'   -- Hydrocarbon Systems
);