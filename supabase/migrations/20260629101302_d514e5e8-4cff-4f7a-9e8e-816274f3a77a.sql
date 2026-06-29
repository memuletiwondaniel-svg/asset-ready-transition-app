
-- ── Helpers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_vcr_item_delivering_party(_user_id uuid, _vcr_item_id uuid, _handover_point_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vcr_item_delivering_parties
    WHERE user_id = _user_id AND vcr_item_id = _vcr_item_id AND handover_point_id = _handover_point_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vcr_item_approving_party(_user_id uuid, _vcr_item_id uuid, _handover_point_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vcr_items vi
    JOIN public.p2a_handover_points hp ON hp.id = _handover_point_id
    JOIN public.p2a_handover_plans hpl ON hpl.id = hp.handover_plan_id
    JOIN public.project_team_members ptm ON ptm.project_id = hpl.project_id AND ptm.user_id = _user_id
    WHERE vi.id = _vcr_item_id
      AND vi.approving_party_role_ids IS NOT NULL
      AND ptm.role::text = ANY (
        SELECT unnest(vi.approving_party_role_ids)::text
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vcr_item_party(_user_id uuid, _vcr_item_id uuid, _handover_point_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_vcr_item_delivering_party(_user_id, _vcr_item_id, _handover_point_id)
      OR public.is_vcr_item_approving_party(_user_id, _vcr_item_id, _handover_point_id);
$$;

-- ── vcr_item_evidence ────────────────────────────────────
CREATE TABLE public.vcr_item_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  vcr_item_id uuid NOT NULL REFERENCES public.vcr_items(id) ON DELETE CASCADE,
  prerequisite_id uuid REFERENCES public.p2a_vcr_prerequisites(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  evidence_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_item_evidence TO authenticated;
GRANT ALL ON public.vcr_item_evidence TO service_role;
ALTER TABLE public.vcr_item_evidence ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER vcr_item_evidence_tenant
  BEFORE INSERT ON public.vcr_item_evidence
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE INDEX idx_vcr_item_evidence_item ON public.vcr_item_evidence(handover_point_id, vcr_item_id);

CREATE POLICY "Tenant members can read evidence"
  ON public.vcr_item_evidence FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id());

CREATE POLICY "Delivering parties can insert evidence"
  ON public.vcr_item_evidence FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_vcr_item_delivering_party(auth.uid(), vcr_item_id, handover_point_id)
  );

CREATE POLICY "Delivering parties can delete evidence"
  ON public.vcr_item_evidence FOR DELETE TO authenticated
  USING (public.is_vcr_item_delivering_party(auth.uid(), vcr_item_id, handover_point_id));

-- ── vcr_item_comments ────────────────────────────────────
CREATE TABLE public.vcr_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  handover_point_id uuid NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  vcr_item_id uuid NOT NULL REFERENCES public.vcr_items(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  action_tag text CHECK (action_tag IS NULL OR action_tag IN ('Completed','Returned','Accepted','Qualification raised')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_item_comments TO authenticated;
GRANT ALL ON public.vcr_item_comments TO service_role;
ALTER TABLE public.vcr_item_comments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER vcr_item_comments_tenant
  BEFORE INSERT ON public.vcr_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE INDEX idx_vcr_item_comments_item ON public.vcr_item_comments(handover_point_id, vcr_item_id, created_at);

CREATE POLICY "Tenant members can read comments"
  ON public.vcr_item_comments FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id());

CREATE POLICY "Item parties can insert comments"
  ON public.vcr_item_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND public.is_vcr_item_party(auth.uid(), vcr_item_id, handover_point_id)
  );

-- ── Storage RLS for vcr-evidence (private bucket) ────────
CREATE POLICY "Tenant members can read vcr-evidence files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vcr-evidence'
    AND EXISTS (
      SELECT 1 FROM public.vcr_item_evidence e
      WHERE e.storage_path = storage.objects.name
        AND (e.tenant_id IS NULL OR e.tenant_id = public.get_user_tenant_id())
    )
  );

CREATE POLICY "Delivering parties can upload vcr-evidence files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vcr-evidence'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Delivering parties can delete vcr-evidence files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vcr-evidence'
    AND EXISTS (
      SELECT 1 FROM public.vcr_item_evidence e
      WHERE e.storage_path = storage.objects.name
        AND public.is_vcr_item_delivering_party(auth.uid(), e.vcr_item_id, e.handover_point_id)
    )
  );
