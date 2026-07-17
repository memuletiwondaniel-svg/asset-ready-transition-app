import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcedureApproverRow {
  id: string;
  procedure_id: string;
  user_id: string;
  role_label: string | null;
  decision: 'APPROVED' | 'REJECTED' | null;
  comment: string | null;
  decided_at: string | null;
  markup_attachment_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ProcedureAttachmentRow {
  id: string;
  procedure_id: string;
  kind: string;
  file_name: string;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  linked_approver_id: string | null;
  uploader_name: string | null;
  uploader_avatar_url: string | null;
}

export interface ProcedureActivityRow {
  id: string;
  procedure_id: string;
  user_id: string | null;
  action: string;
  comment: string | null;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
}

export interface ProcedureSystem {
  id: string;
  system_id: string | null;
  name: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ProcedureLifecycleData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  procedure: any;
  author: {
    user_id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role_label: string | null;
  } | null;
  approvers: ProcedureApproverRow[];
  attachments: ProcedureAttachmentRow[];
  activity: ProcedureActivityRow[];
  systems: ProcedureSystem[];
}

/**
 * Fetches everything the Procedure drawer needs: procedure row + approvers +
 * attachments + activity log + author + applicable systems (via the parent
 * handover point's system map — procedures inherit HP system context).
 */
export function useProcedureLifecycle(procedureId: string | null | undefined) {
  return useQuery<ProcedureLifecycleData | null>({
    queryKey: ['procedure-lifecycle', procedureId],
    enabled: !!procedureId,
    queryFn: async () => {
      if (!procedureId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data: procedure, error: prErr } = await client
        .from('p2a_vcr_procedures')
        .select('*')
        .eq('id', procedureId)
        .maybeSingle();
      if (prErr) throw prErr;
      if (!procedure) return null;

      const [
        { data: approvers },
        { data: attachments },
        { data: activity },
      ] = await Promise.all([
        client.from('p2a_vcr_procedure_approvers').select('*').eq('procedure_id', procedureId).order('created_at'),
        client.from('p2a_vcr_procedure_attachments').select('*').eq('procedure_id', procedureId).order('created_at'),
        client.from('p2a_vcr_procedure_activity_log').select('*').eq('procedure_id', procedureId).order('created_at'),
      ]);

      const uids = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (approvers || []).forEach((r: any) => r.user_id && uids.add(r.user_id));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (attachments || []).forEach((a: any) => a.uploaded_by && uids.add(a.uploaded_by));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (activity || []).forEach((a: any) => a.user_id && uids.add(a.user_id));
      const authorUserId = procedure.author_user_id || procedure.created_by || null;
      if (authorUserId) uids.add(authorUserId);

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

      // Applicable systems: pull from HP -> systems.
      let systems: ProcedureSystem[] = [];
      if (procedure.handover_point_id) {
        const { data: hpSys } = await client
          .from('p2a_handover_point_systems')
          .select('system_id')
          .eq('handover_point_id', procedure.handover_point_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ids = (hpSys || []).map((r: any) => r.system_id).filter(Boolean);
        if (ids.length > 0) {
          const { data: sysRows } = await client
            .from('p2a_systems')
            .select('id, system_id, name')
            .in('id', ids);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          systems = (sysRows || []).map((s: any) => ({ id: s.id, system_id: s.system_id, name: s.name }));
        }
      }

      const decorate = (uid: string | null | undefined) => {
        if (!uid) return { full_name: null, avatar_url: null };
        return profileMap.get(uid) || { full_name: null, avatar_url: null };
      };

      return {
        procedure,
        author: authorUserId
          ? {
              user_id: authorUserId,
              ...decorate(authorUserId),
              role_label: 'Author',
            }
          : null,
        approvers: (approvers || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => ({ ...r, ...decorate(r.user_id) }),
        ) as ProcedureApproverRow[],
        attachments: (attachments || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => ({
            ...a,
            uploader_name: decorate(a.uploaded_by).full_name,
            uploader_avatar_url: decorate(a.uploaded_by).avatar_url,
          }),
        ) as ProcedureAttachmentRow[],
        activity: (activity || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => ({
            ...a,
            actor_name: decorate(a.user_id).full_name,
            actor_avatar_url: decorate(a.user_id).avatar_url,
          }),
        ) as ProcedureActivityRow[],
        systems,
      };
    },
  });
}
