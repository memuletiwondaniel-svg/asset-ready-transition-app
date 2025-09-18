-- Delete specific checklist items GN-02 and GN-03 from the database
DELETE FROM public.checklist_items WHERE unique_id = 'GN-02';
DELETE FROM public.checklist_items WHERE unique_id = 'GN-03';

-- Resequence the remaining items in the General category
SELECT public.update_checklist_sequence_numbers('General');