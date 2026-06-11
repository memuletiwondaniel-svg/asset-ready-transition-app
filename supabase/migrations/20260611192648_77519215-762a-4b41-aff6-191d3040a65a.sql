CREATE OR REPLACE FUNCTION public.vcr_doc_req_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vcr_doc_req_set_tenant_id ON public.vcr_document_requirements;
CREATE TRIGGER trg_vcr_doc_req_set_tenant_id
BEFORE INSERT ON public.vcr_document_requirements
FOR EACH ROW EXECUTE FUNCTION public.vcr_doc_req_set_tenant_id();