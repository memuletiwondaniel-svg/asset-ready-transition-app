import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrainingReviewerRow {
  id: string;
  training_id: string;
  user_id: string;
  role_label: string | null;
  decision: 'APPROVED' | 'REJECTED' | null;
  decision_comment: string | null;
  decided_at: string | null;
  markup_attachment_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface TrainingAttachmentRow {
  id: string;
  training_id: string;
  kind: string; // 'draft' | 'markup' | 'evidence' | 'po' | 'attendance' | 'material' etc.
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  linked_reviewer_id: string | null;
  uploader_name: string | null;
  uploader_avatar_url: string | null;
}

export interface TrainingActivityRow {
  id: string;
  training_id: string;
  user_id: string | null;
  action: string;
  comment: string | null;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
  actor_role: string | null;
}

export interface TrainingLifecycleData {
  training: any;
  author: { user_id: string | null; full_name: string | null; avatar_url: string | null; role_label: string | null } | null;
  reviewers: TrainingReviewerRow[];
  attachments: TrainingAttachmentRow[];
  activity: TrainingActivityRow[];
  systems: { id: string; system_id: string | null; name: string | null }[];
}

export function useTrainingLifecycle(trainingId: string | null | undefined) {
  return useQuery<TrainingLifecycleData | null>({
    queryKey: ['training-lifecycle', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      if (!trainingId) return null;
      const client = supabase as any;

      const { data: training, error: trErr } = await client
        .from('p2a_vcr_training')
        .select('*')
        .eq('id', trainingId)
        .maybeSingle();
      if (trErr) throw trErr;
      if (!training) return null;

      const [
        { data: reviewers },
        { data: attachments },
        { data: activity },
      ] = await Promise.all([
        client.from('p2a_vcr_training_reviewers').select('*').eq('training_id', trainingId).order('created_at'),
        client.from('p2a_vcr_training_attachments').select('*').eq('training_id', trainingId).order('uploaded_at'),
        client.from('p2a_vcr_training_activity_log').select('*').eq('training_id', trainingId).order('created_at'),
      ]);

      // Collect all user_ids we need profile info for
      const uids = new Set<string>();
      (reviewers || []).forEach((r: any) => r.user_id && uids.add(r.user_id));
      (attachments || []).forEach((a: any) => a.uploaded_by && uids.add(a.uploaded_by));
      (activity || []).forEach((a: any) => a.user_id && uids.add(a.user_id));
      if (training.created_by) uids.add(training.created_by);

      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (uids.size > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', Array.from(uids));
        profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
        );
      }

      // Applicable systems (name lookup)
      const systemIds: string[] = Array.isArray(training.system_ids) ? training.system_ids : [];
      let systems: { id: string; system_id: string | null; name: string | null }[] = [];
      if (systemIds.length > 0) {
        const { data: sysRows } = await client
          .from('p2a_systems')
          .select('id, system_id, name')
          .in('id', systemIds);
        systems = sysRows || [];
      }

      const decorate = (uid: string | null | undefined) => {
        if (!uid) return { full_name: null, avatar_url: null };
        return profileMap.get(uid) || { full_name: null, avatar_url: null };
      };

      return {
        training,
        author: training.created_by
          ? {
              user_id: training.created_by,
              ...decorate(training.created_by),
              role_label: null,
            }
          : null,
        reviewers: (reviewers || []).map((r: any) => ({ ...r, ...decorate(r.user_id) })) as TrainingReviewerRow[],
        attachments: (attachments || []).map((a: any) => ({
          ...a,
          uploader_name: decorate(a.uploaded_by).full_name,
          uploader_avatar_url: decorate(a.uploaded_by).avatar_url,
        })) as TrainingAttachmentRow[],
        activity: (activity || []).map((a: any) => ({
          ...a,
          actor_name: decorate(a.user_id).full_name,
          actor_avatar_url: decorate(a.user_id).avatar_url,
          actor_role: null,
        })) as TrainingActivityRow[],
        systems,
      };
    },
  });
}
