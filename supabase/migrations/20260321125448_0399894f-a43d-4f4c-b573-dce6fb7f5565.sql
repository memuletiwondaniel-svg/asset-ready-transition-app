
-- Add system_id column to p2a_vcr_critical_docs to track which system a document applies to
ALTER TABLE public.p2a_vcr_critical_docs
ADD COLUMN system_id uuid REFERENCES public.p2a_systems(id) ON DELETE SET NULL;

-- Add dms_document_type_id column to link directly to DMS master list
ALTER TABLE public.p2a_vcr_critical_docs
ADD COLUMN dms_document_type_id uuid REFERENCES public.dms_document_types(id) ON DELETE SET NULL;

-- Add dms_platforms column to handover plans for AI context
ALTER TABLE public.p2a_handover_plans
ADD COLUMN dms_platforms text[] DEFAULT '{}';

-- Create index for performance on new columns
CREATE INDEX idx_vcr_critical_docs_system_id ON public.p2a_vcr_critical_docs(system_id);
CREATE INDEX idx_vcr_critical_docs_dms_doc_type ON public.p2a_vcr_critical_docs(dms_document_type_id);
