import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * FE-1: canonical loader for the Witness & Hold tab on a VCR handover point.
 *
 * Reads the new columns on `p2a_itp_activities` (status enum, delivering
 * party role, scheduled/completed timestamps, outcome_summary) plus joined
 * accepting parties, activity log, attachments, and the p2a_systems record
 * for a real SYSTEM label (`system_id · name`). No JSON parsing from notes —
 * the DB-2 migration back-filled everything into columns.
 */

export type WHStatus =
  | 'NOT_STARTED'
  | 'SCHEDULED'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'REWORK_REQUESTED';

export interface WHSystem {
  id: string;             // uuid PK
  system_id: string;      // text, e.g. "SYS-2101"
  name: string;
}

export interface WHAcceptingParty {
  id: string;
  role_id: string | null;
  role_name: string | null;
  user_id: string | null;
  user_full_name: string | null;
  user_avatar_url: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  decided_at: string | null;
}

export interface WHLogEntry {
  id: string;
  user_id: string | null;
  user_full_name: string | null;
  user_avatar_url: string | null;
  action: string;
  comment: string | null;
  created_at: string;
}

export interface WHAttachment {
  id: string;
  kind: string;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface WHPoint {
  id: string;
  handover_point_id: string;
  activity_name: string;
  inspection_type: 'WITNESS' | 'HOLD' | string;
  status: WHStatus;
  notes: string | null;
  display_order: number;
  system: WHSystem | null;
  delivering_party_role_id: string | null;
  delivering_party_role_name: string | null;
  scheduled_at: string | null;
  scheduled_end: string | null;
  location: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  outcome_summary: string | null;
  accepting_parties: WHAcceptingParty[];
  activity_log: WHLogEntry[];
  attachments: WHAttachment[];
}

export interface WHContext {
  points: WHPoint[];
  projectId: string | null;
}

async function fetchProfilesMap(
  userIds: string[],
): Promise<Map<string, { full_name: string; avatar_url: string | null }>> {
  const c = supabase as any;
  const uniq = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, { full_name: string; avatar_url: string | null }>();
  await Promise.all(
    uniq.map(async (uid) => {
      const r = await c.rpc('get_safe_profile_data', { target_user_id: uid });
      const row = Array.isArray(r.data) ? r.data[0] : r.data;
      map.set(uid, {
        full_name: row?.full_name || 'Unknown',
        avatar_url: row?.avatar_url ?? null,
      });
    }),
  );
  return map;
}

export const useWHPoints = (handoverPointId: string | undefined) => {
  return useQuery({
    enabled: !!handoverPointId,
    queryKey: ['wh-points', handoverPointId],
    queryFn: async (): Promise<WHContext> => {
      const c = supabase as any;

      // 1. Fetch W&H activities
      const actRes = await c
        .from('p2a_itp_activities')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('display_order');
      if (actRes.error) throw actRes.error;
      const activities = (actRes.data || []) as any[];

      if (activities.length === 0) {
        // still resolve project id for consistency
        const hp = await c
          .from('p2a_handover_points')
          .select('handover_plan_id, p2a_handover_plans!inner(project_id)')
          .eq('id', handoverPointId)
          .maybeSingle();
        const projectId =
          hp.data?.p2a_handover_plans?.project_id ?? null;
        return { points: [], projectId };
      }

      // 2. Fetch joined systems by uuid
      const systemUuids = Array.from(
        new Set(activities.map((a) => a.system_id).filter(Boolean)),
      );
      const sysRes = systemUuids.length
        ? await c
            .from('p2a_systems')
            .select('id, system_id, name, handover_plan_id')
            .in('id', systemUuids)
        : { data: [] };
      const systemsById = new Map<string, WHSystem>(
        (sysRes.data || []).map((s: any) => [
          s.id,
          { id: s.id, system_id: s.system_id, name: s.name },
        ]),
      );

      // 3. Resolve project id via the first system's handover_plan_id
      let projectId: string | null = null;
      const anyPlanId =
        (sysRes.data || []).find((s: any) => s.handover_plan_id)?.handover_plan_id ??
        null;
      if (anyPlanId) {
        const pl = await c
          .from('p2a_handover_plans')
          .select('project_id')
          .eq('id', anyPlanId)
          .maybeSingle();
        projectId = pl.data?.project_id ?? null;
      } else {
        const hp = await c
          .from('p2a_handover_points')
          .select('handover_plan_id')
          .eq('id', handoverPointId)
          .maybeSingle();
        if (hp.data?.handover_plan_id) {
          const pl = await c
            .from('p2a_handover_plans')
            .select('project_id')
            .eq('id', hp.data.handover_plan_id)
            .maybeSingle();
          projectId = pl.data?.project_id ?? null;
        }
      }

      const activityIds = activities.map((a) => a.id);

      // 4. Accepting parties
      const apRes = await c
        .from('p2a_itp_accepting_parties')
        .select('id, itp_activity_id, role_id, user_id, status, comment, decided_at')
        .in('itp_activity_id', activityIds)
        .order('created_at');
      const apRows = (apRes.data || []) as any[];

      // 5. Activity log
      const logRes = await c
        .from('p2a_itp_activity_log')
        .select('id, itp_activity_id, user_id, action, comment, created_at')
        .in('itp_activity_id', activityIds)
        .order('created_at');
      const logRows = (logRes.data || []) as any[];

      // 6. Attachments
      const attRes = await c
        .from('p2a_itp_attachments')
        .select('*')
        .in('itp_activity_id', activityIds)
        .order('created_at');
      const attRows = (attRes.data || []) as any[];

      // 7. Roles map (delivering + accepting)
      const roleIds = Array.from(
        new Set(
          [
            ...activities.map((a) => a.delivering_party_role_id),
            ...apRows.map((r) => r.role_id),
          ].filter(Boolean),
        ),
      );
      const rolesRes = roleIds.length
        ? await c.from('roles').select('id, name').in('id', roleIds)
        : { data: [] };
      const roleNameById = new Map<string, string>(
        (rolesRes.data || []).map((r: any) => [r.id, r.name]),
      );

      // 8. Profiles for accepting parties + log actors
      const userIds = [
        ...apRows.map((r) => r.user_id),
        ...logRows.map((r) => r.user_id),
      ].filter(Boolean) as string[];
      const profiles = await fetchProfilesMap(userIds);

      // 9. Assemble
      const points: WHPoint[] = activities.map((a) => ({
        id: a.id,
        handover_point_id: a.handover_point_id,
        activity_name: a.activity_name,
        inspection_type: a.inspection_type,
        status: (a.status || 'NOT_STARTED') as WHStatus,
        notes: a.notes,
        display_order: a.display_order,
        system: a.system_id ? systemsById.get(a.system_id) ?? null : null,
        delivering_party_role_id: a.delivering_party_role_id,
        delivering_party_role_name: a.delivering_party_role_id
          ? roleNameById.get(a.delivering_party_role_id) ?? null
          : null,
        scheduled_at: a.scheduled_at,
        scheduled_end: a.scheduled_end,
        location: a.location,
        submitted_at: a.submitted_at,
        completed_at: a.completed_at,
        outcome_summary: a.outcome_summary,
        accepting_parties: apRows
          .filter((r) => r.itp_activity_id === a.id)
          .map<WHAcceptingParty>((r) => {
            const p = r.user_id ? profiles.get(r.user_id) : null;
            return {
              id: r.id,
              role_id: r.role_id,
              role_name: r.role_id ? roleNameById.get(r.role_id) ?? null : null,
              user_id: r.user_id,
              user_full_name: p?.full_name ?? null,
              user_avatar_url: p?.avatar_url ?? null,
              status: r.status,
              comment: r.comment,
              decided_at: r.decided_at,
            };
          }),
        activity_log: logRows
          .filter((r) => r.itp_activity_id === a.id)
          .map<WHLogEntry>((r) => {
            const p = r.user_id ? profiles.get(r.user_id) : null;
            return {
              id: r.id,
              user_id: r.user_id,
              user_full_name: p?.full_name ?? null,
              user_avatar_url: p?.avatar_url ?? null,
              action: r.action,
              comment: r.comment,
              created_at: r.created_at,
            };
          }),
        attachments: attRows
          .filter((r) => r.itp_activity_id === a.id)
          .map<WHAttachment>((r) => ({
            id: r.id,
            kind: r.kind,
            file_path: r.file_path,
            file_name: r.file_name,
            uploaded_by: r.uploaded_by,
            created_at: r.created_at,
          })),
      }));

      return { points, projectId };
    },
  });
};

// ─── Presentation helpers ───────────────────────────────────────────────────

export interface WHStatusPresentation {
  label: string;
  tone: 'red' | 'amber' | 'slate' | 'blue' | 'emerald';
  bucketOrder: number;
}

/** Bucket order per FE-1 spec: REWORK → UNDER_REVIEW → NOT_STARTED → SCHEDULED → COMPLETED. */
export const WH_STATUS_PRESENTATION: Record<WHStatus, WHStatusPresentation> = {
  REWORK_REQUESTED: { label: 'Rework requested', tone: 'red',     bucketOrder: 0 },
  UNDER_REVIEW:     { label: 'Under review',     tone: 'amber',   bucketOrder: 1 },
  NOT_STARTED:      { label: 'Not started',      tone: 'slate',   bucketOrder: 2 },
  SCHEDULED:        { label: 'Scheduled',        tone: 'blue',    bucketOrder: 3 },
  COMPLETED:        { label: 'Completed',        tone: 'emerald', bucketOrder: 4 },
};

export const sortByStatusBucket = (a: WHPoint, b: WHPoint) => {
  const oa = WH_STATUS_PRESENTATION[a.status].bucketOrder;
  const ob = WH_STATUS_PRESENTATION[b.status].bucketOrder;
  if (oa !== ob) return oa - ob;
  return (a.display_order ?? 0) - (b.display_order ?? 0);
};

export const typeLabel = (t: string) => (t === 'HOLD' ? 'Hold point' : 'Witness point');
