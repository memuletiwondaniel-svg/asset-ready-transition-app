import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Real-data rollup for the Parties tab (four groups).
 *
 * Server-truth only — every fraction is computed from actual junction rows,
 * never from a client aggregate over stale UI state. If a source table has
 * no rows for this VCR the group renders an honest empty state.
 *
 * Data sources
 *  - Delivering: `vcr_item_delivering_parties` joined to this VCR's
 *    prerequisites (via `prerequisite_id`). `completed` = the prereq's
 *    status is in the terminal set.
 *  - Approving: `vcr_prerequisite_approvals` for the same prereq set.
 *    `completed` = row.status === 'APPROVED'.
 *  - SoF: `vcr_sof_approvers` (HC-gated at the render layer).
 *  - PAC: reuses `vcr_sof_approvers` filtered by `approver_role` containing
 *    'PAC' when present — the dedicated `vcr_pac_approvers` table does not
 *    yet exist in this schema (flagged in report). Empty state otherwise.
 */

const TERMINAL_STATUSES = new Set([
  'ACCEPTED',
  'READY_FOR_REVIEW',
  'QUALIFICATION_APPROVED',
]);

export interface PartyPerson {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  role_name: string | null;
  assigned: number;
  completed: number;
  signed?: boolean;
  signed_at?: string | null;
}

export interface PartiesRollup {
  delivering: PartyPerson[];
  approving: PartyPerson[];
  sof: PartyPerson[];
  pac: PartyPerson[];
}

async function resolveProfiles(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, any>();
  const { data } = await (supabase as any)
    .from('profiles')
    .select('user_id, full_name, avatar_url, position, role')
    .in('user_id', userIds);
  const roleIds = [
    ...new Set((data || []).map((p: any) => p.role).filter(Boolean)),
  ] as string[];
  let roleMap: Record<string, string> = {};
  if (roleIds.length > 0) {
    const { data: roles } = await (supabase as any)
      .from('roles')
      .select('id, name')
      .in('id', roleIds);
    (roles || []).forEach((r: any) => {
      roleMap[r.id] = r.name;
    });
  }
  const map = new Map<string, any>();
  (data || []).forEach((p: any) => {
    map.set(p.user_id, {
      ...p,
      role_name: p.role ? roleMap[p.role] || null : null,
    });
  });
  return map;
}

export function useVCRPartiesRollup(handoverPointId: string | null | undefined) {
  return useQuery({
    queryKey: ['vcr-parties-rollup', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async (): Promise<PartiesRollup> => {
      const empty: PartiesRollup = { delivering: [], approving: [], sof: [], pac: [] };
      if (!handoverPointId) return empty;
      const client = supabase as any;

      // 1) Prereqs for this VCR — status map keyed by id
      const { data: prereqs } = await client
        .from('p2a_vcr_prerequisites')
        .select('id, status')
        .eq('handover_point_id', handoverPointId);
      const prereqStatus = new Map<string, string>();
      (prereqs || []).forEach((p: any) => prereqStatus.set(p.id, p.status));
      const prereqIds = [...prereqStatus.keys()];

      // 2) Delivering parties (junction)
      let deliveringRows: any[] = [];
      if (prereqIds.length > 0) {
        const { data } = await client
          .from('vcr_item_delivering_parties')
          .select('user_id, prerequisite_id')
          .in('prerequisite_id', prereqIds);
        deliveringRows = data || [];
      }

      // 3) Approving parties (per-prereq approvals)
      let approvingRows: any[] = [];
      if (prereqIds.length > 0) {
        const { data } = await client
          .from('vcr_prerequisite_approvals')
          .select('approver_id, prerequisite_id, status')
          .in('prerequisite_id', prereqIds);
        approvingRows = data || [];
      }

      // 4) SoF (and PAC) approver rows
      const { data: sofRows } = await client
        .from('vcr_sof_approvers')
        .select('user_id, approver_name, approver_role, status, signed_at')
        .eq('handover_point_id', handoverPointId);

      // Collect user_ids across all sources for a single profile resolution.
      const allUserIds = new Set<string>();
      deliveringRows.forEach((r) => r.user_id && allUserIds.add(r.user_id));
      approvingRows.forEach((r) => r.approver_id && allUserIds.add(r.approver_id));
      (sofRows || []).forEach((r: any) => r.user_id && allUserIds.add(r.user_id));

      const profileMap = await resolveProfiles([...allUserIds]);

      const buildRollup = (
        rows: Array<{ user_id: string; prereq_id: string | null }>,
        completionCheck: (row: any) => boolean,
      ): PartyPerson[] => {
        const byUser = new Map<
          string,
          { assigned: Set<string>; completed: Set<string> }
        >();
        rows.forEach((r) => {
          if (!r.user_id) return;
          const bucket = byUser.get(r.user_id) || {
            assigned: new Set<string>(),
            completed: new Set<string>(),
          };
          if (r.prereq_id) {
            bucket.assigned.add(r.prereq_id);
            if (completionCheck(r)) bucket.completed.add(r.prereq_id);
          }
          byUser.set(r.user_id, bucket);
        });
        return [...byUser.entries()]
          .map(([user_id, b]) => {
            const p = profileMap.get(user_id);
            return {
              user_id,
              full_name: p?.full_name || 'Unknown',
              avatar_url: p?.avatar_url ?? null,
              position: p?.position ?? null,
              role_name: p?.role_name ?? null,
              assigned: b.assigned.size,
              completed: b.completed.size,
            };
          })
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
      };

      const delivering = buildRollup(
        deliveringRows.map((r) => ({
          user_id: r.user_id,
          prereq_id: r.prerequisite_id,
        })),
        (row) => TERMINAL_STATUSES.has(prereqStatus.get(row.prereq_id) || ''),
      );

      const approving = buildRollup(
        approvingRows.map((r) => ({
          user_id: r.approver_id,
          prereq_id: r.prerequisite_id,
          status: r.status,
        })),
        (row) => row.status === 'APPROVED',
      );

      const sofPeople: PartyPerson[] = (sofRows || [])
        .filter((r: any) => !/\bPAC\b/i.test(r.approver_role || ''))
        .map((r: any) => {
          const p = profileMap.get(r.user_id);
          return {
            user_id: r.user_id,
            full_name: p?.full_name || r.approver_name || 'Unknown',
            avatar_url: p?.avatar_url ?? null,
            position: p?.position ?? r.approver_role ?? null,
            role_name: r.approver_role || p?.role_name || null,
            assigned: 1,
            completed: r.status === 'SIGNED' ? 1 : 0,
            signed: r.status === 'SIGNED',
            signed_at: r.signed_at ?? null,
          };
        });

      const pacPeople: PartyPerson[] = (sofRows || [])
        .filter((r: any) => /\bPAC\b/i.test(r.approver_role || ''))
        .map((r: any) => {
          const p = profileMap.get(r.user_id);
          return {
            user_id: r.user_id,
            full_name: p?.full_name || r.approver_name || 'Unknown',
            avatar_url: p?.avatar_url ?? null,
            position: p?.position ?? r.approver_role ?? null,
            role_name: r.approver_role || p?.role_name || null,
            assigned: 1,
            completed: r.status === 'SIGNED' ? 1 : 0,
            signed: r.status === 'SIGNED',
            signed_at: r.signed_at ?? null,
          };
        });

      return { delivering, approving, sof: sofPeople, pac: pacPeople };
    },
    staleTime: 30_000,
  });
}
