-- Add missing DELETE policies so users can clear/uncheck their VCR critical document selections.
-- Root cause: vcr_document_requirements had no DELETE policy, so RLS silently dropped 0 rows.

CREATE POLICY "vcr_doc_req_delete"
ON public.vcr_document_requirements
FOR DELETE
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Mirror the open authenticated access pattern already used for SELECT on the shadow table.
CREATE POLICY "p2a_vcr_critical_docs_delete_auth"
ON public.p2a_vcr_critical_docs
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "p2a_vcr_critical_docs_insert_auth"
ON public.p2a_vcr_critical_docs
FOR INSERT
TO authenticated
WITH CHECK (true);