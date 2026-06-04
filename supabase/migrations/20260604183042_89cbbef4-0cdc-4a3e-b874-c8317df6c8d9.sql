-- Drop broken JWT-claim policies
DROP POLICY IF EXISTS vcr_doc_req_insert ON public.vcr_document_requirements;
DROP POLICY IF EXISTS vcr_doc_req_select ON public.vcr_document_requirements;
DROP POLICY IF EXISTS vcr_doc_req_update ON public.vcr_document_requirements;

-- Recreate using public.get_user_tenant_id() helper (resolves tenant via profiles)
CREATE POLICY vcr_doc_req_select ON public.vcr_document_requirements
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY vcr_doc_req_insert ON public.vcr_document_requirements
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY vcr_doc_req_update ON public.vcr_document_requirements
  FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Attach trigger to auto-populate tenant_id on insert
DROP TRIGGER IF EXISTS trg_set_tenant_id_vcr_doc_req ON public.vcr_document_requirements;
CREATE TRIGGER trg_set_tenant_id_vcr_doc_req
  BEFORE INSERT ON public.vcr_document_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();