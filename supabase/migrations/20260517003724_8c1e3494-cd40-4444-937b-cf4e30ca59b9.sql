
CREATE TABLE public.person_activity_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  label text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pae_person_activity ON public.person_activity_evidence(person_id, activity_id);

ALTER TABLE public.person_activity_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read person_activity_evidence" ON public.person_activity_evidence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth insert person_activity_evidence" ON public.person_activity_evidence FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update person_activity_evidence" ON public.person_activity_evidence FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete person_activity_evidence" ON public.person_activity_evidence FOR DELETE USING (auth.uid() IS NOT NULL);

INSERT INTO storage.buckets (id, name, public) VALUES ('activity-evidence', 'activity-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read activity-evidence" ON storage.objects FOR SELECT USING (bucket_id = 'activity-evidence' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth insert activity-evidence" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'activity-evidence' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth update activity-evidence" ON storage.objects FOR UPDATE USING (bucket_id = 'activity-evidence' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth delete activity-evidence" ON storage.objects FOR DELETE USING (bucket_id = 'activity-evidence' AND auth.uid() IS NOT NULL);
