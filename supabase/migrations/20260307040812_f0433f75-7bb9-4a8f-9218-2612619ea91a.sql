
CREATE TABLE public.ora_activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ora_plan_activity_id TEXT NOT NULL,
  orp_plan_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_ora_activity_comments_tenant
  BEFORE INSERT ON public.ora_activity_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

ALTER TABLE public.ora_activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read comments in their tenant"
  ON public.ora_activity_comments FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own comments"
  ON public.ora_activity_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_ora_activity_comments_activity 
  ON public.ora_activity_comments(ora_plan_activity_id);
