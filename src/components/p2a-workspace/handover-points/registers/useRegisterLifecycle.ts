import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegisterReviewerRow {
  id: string;
  register_id: string;
  reviewer_id: string;
  role_label: string | null;
  decision: 'pending' | 'approved' | 'rejected' | null;
  decision_at: string | null;
  decision_comment: string | null;
  reviewer_order: number | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface RegisterAttachmentRow {
  id: string;
  register_id: string;
  attachment_kind: string | null;
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader_name: string | null;
  uploader_avatar_url: string | null;
}

export interface RegisterActivityRow {
  id: string;
  register_id: string;
  actor_id: string | null;
  action: string;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
}

export interface RegisterLifecycleData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  author: {
    user_id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role_label: string | null;
  } | null;
  reviewers: RegisterReviewerRow[];
  attachments: RegisterAttachmentRow[];
  activity: RegisterActivityRow[];
}

const BUCKET = 'register-attachments';

export function useRegisterLifecycle(registerId: string | null | undefined) {
  return useQuery<RegisterLifecycleData | null>({
    queryKey: ['register-lifecycle', registerId],
    enabled: !!registerId,
    queryFn: async () => {
      if (!registerId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data: register, error } = await client
        .from('p2a_vcr_operational_registers')
        .select('*')
        .eq('id', registerId)
        .maybeSingle();
      if (error) throw error;
      if (!register) return null;

      const [
        { data: reviewers },
        { data: attachments },
        { data: activity },
      ] = await Promise.all([
        client.from('p2a_vcr_register_reviewers').select('*').eq('register_id', registerId).order('reviewer_order'),
        client.from('p2a_vcr_register_attachments').select('*').eq('register_id', registerId).order('created_at'),
        client.from('p2a_vcr_register_activity_log').select('*').eq('register_id', registerId).order('created_at'),
      ]);

      const uids = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (reviewers || []).forEach((r: any) => r.reviewer_id && uids.add(r.reviewer_id));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (attachments || []).forEach((a: any) => a.uploaded_by && uids.add(a.uploaded_by));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (activity || []).forEach((a: any) => a.actor_id && uids.add(a.actor_id));

      // Live-resolve author via role pointer when present, otherwise fall back
      // to the register's draft_owner / created_by (matches the maintenance-
      // deliverable pointer pattern).
      let liveAuthorId: string | null = null;
      let liveAuthorRoleLabel: string | null = null;
      if (register.author_role_id && register.handover_point_id) {
        const { data: vcr } = await client
          .from('p2a_handover_points')
          .select('project_id')
          .eq('id', register.handover_point_id)
          .maybeSingle();
        if (vcr?.project_id) {
          const { data: holderId } = await client.rpc('resolve_role_holder', {
            p_project_id: vcr.project_id,
            p_role_id: register.author_role_id,
          });
          if (holderId) liveAuthorId = holderId as string;
        }
        const { data: role } = await client
          .from('roles')
          .select('name')
          .eq('id', register.author_role_id)
          .maybeSingle();
        if (role?.name) liveAuthorRoleLabel = role.name;
      }
      const authorId = liveAuthorId || register.draft_owner_id || register.created_by || null;
      if (authorId) uids.add(authorId);

      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (uids.size > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', Array.from(uids));
        profileMap = new Map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (profiles || []).map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
        );
      }

      const decorate = (uid: string | null | undefined) => {
        if (!uid) return { full_name: null, avatar_url: null };
        return profileMap.get(uid) || { full_name: null, avatar_url: null };
      };

      // Resolve public URLs for attachments (file_path is a storage key)
      const decoratedAttachments: RegisterAttachmentRow[] = (attachments || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => {
          let url = a.file_path;
          if (a.file_path && !a.file_path.startsWith('http')) {
            url = supabase.storage.from(BUCKET).getPublicUrl(a.file_path).data.publicUrl;
          }
          return {
            ...a,
            file_path: url,
            uploader_name: decorate(a.uploaded_by).full_name,
            uploader_avatar_url: decorate(a.uploaded_by).avatar_url,
          };
        },
      );

      return {
        register,
        author: authorId
          ? {
              user_id: authorId,
              ...decorate(authorId),
              role_label: liveAuthorRoleLabel || 'Delivering party',
            }
          : null,
        reviewers: (reviewers || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => ({ ...r, ...decorate(r.reviewer_id) }),
        ) as RegisterReviewerRow[],
        attachments: decoratedAttachments,
        activity: (activity || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => ({
            ...a,
            actor_name: decorate(a.actor_id).full_name,
            actor_avatar_url: decorate(a.actor_id).avatar_url,
          }),
        ) as RegisterActivityRow[],
      };
    },
  });
}

/**
 * A user is the current owner of a register row when they have an open
 * user_tasks row for it — mirrors advance_register_status ownership gate.
 */
export function useRegisterOwnership(registerId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['register-ownership', registerId, userId],
    enabled: !!registerId && !!userId,
    queryFn: async () => {
      if (!registerId || !userId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from('user_tasks')
        .select('id, type, status')
        .eq('source_plan_table', 'p2a_vcr_operational_registers')
        .eq('source_plan_id', registerId)
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress']);
      if (error) throw error;
      const rows = data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ownerTask = rows.find((t: any) => t.type === 'register_action') || null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reviewTask = rows.find((t: any) => t.type === 'register_review') || null;
      return {
        isOwner: !!ownerTask,
        isReviewer: !!reviewTask,
        ownerTaskId: ownerTask?.id ?? null,
        reviewTaskId: reviewTask?.id ?? null,
      };
    },
  });
}
