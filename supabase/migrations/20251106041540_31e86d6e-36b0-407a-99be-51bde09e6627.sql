-- Enable realtime for checklist_items table
ALTER TABLE public.checklist_items REPLICA IDENTITY FULL;

-- The table is automatically added to the realtime publication
-- No need to manually add it to supabase_realtime publication