
DROP TRIGGER IF EXISTS trigger_update_project_documents_updated_at ON public.project_documents;

UPDATE public.project_documents
   SET project_id = '60699f18-fe21-4eb9-8ff9-a25c47a996a3'
 WHERE id = '374a89d5-b3d1-4adc-8738-ace5a435c36d';
