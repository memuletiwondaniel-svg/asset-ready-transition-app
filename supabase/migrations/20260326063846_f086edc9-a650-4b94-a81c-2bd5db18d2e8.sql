-- Add a unique index that handles NULL project_id for bulk upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_external_sync_platform_docnum 
ON public.dms_external_sync (dms_platform, document_number) 
WHERE project_id IS NULL;