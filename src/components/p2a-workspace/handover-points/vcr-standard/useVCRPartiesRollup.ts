import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Parties tab rollup — role-holder resolution (NO TA seeding).
 *
 * DELIVERING: each VCR ITEM carries a pre-configured `delivering_party_role_id`
 *   (roles.name via `vcr_items.delivering_party_role_id`). For every prereq
 *   in this VCR we resolve that role to the actual person(s) for THIS project
 *   using the standard PTM → roster → org precedence. TAs are never delivering
 *   parties — the buggy `vcr_item_delivering_parties` junction seeding is
 *   ignored here (it stays in place for editorial flows elsewhere).
 *
 * APPROVING: unchanged — `vcr_prerequisite_approvals` (TA2 per discipline).
 *
 * SoF: hardcoded to the four SoF-certificate signatories:
 *     Plant Director · P&M Director · P&E Director · HSSE Director
 * PAC: hardcoded to Project Hub Lead + Plant Director.
 * Both are resolved per project via the same PTM/roster/org precedence.
 * Signed status (if any) is overlaid from `vcr_sof_approvers`.
 */

const TERMINAL_STATUSES = new Set([
  'ACCEPTED',
  'READY_FOR_REVIEW',
  'QUALIFICATION_APPROVED',
]);

const APPROVED_APPROVAL_STATUSES = new Set(['ACCEPTED', 'QUALIFIED', 'APPROVED']);

const SOF_ROLE_LABELS = [
  'Plant Director',
  'P&M Director',
  'P&E Director',
  'HSSE Director',
] as const;

const PAC_ROLE_LABELS = ['Project Hub Lead', 'Plant Director'] as const;

export interface PartyItem {
  prereq_id: string;
  summary: string;
  status: string;
}

export interface PartyPerson {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  role_name: string | null;
  assigned: number;
  completed: number;
  items: PartyItem[];
  signed?: boolean;
  signed_at?: string | null;
}

export interface PartiesRollup {
  delivering: PartyPerson[];
  approving: PartyPerson[];
  sof: PartyPerson[];
  pac: PartyPerson[];
  /** Party-name index for VCR Items party-search: prereq_id → names. */
  deliveringByPrereq: Record<string, string[]>;
  approvingByPrereq: Record<string, string[]>;
}

/* ---------------- Helpers ---------------- */

async function resolveProfiles(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, any>();
  const { data } = await (supabase as any)
    .from('profiles')
    .select('user_id, full_name, avatar_url, position, role')
    .in('user_id', userIds);
  const roleIds = [...new Set((data || []).map((p: any) => p.role).filter(Boolean))] as string[];
  const roleMap: Record<string, string> = {};
  if (roleIds.length > 0) {
    const { data: roles } = await (supabase as any)
      .from('roles')
      .select('id, name')
      .in('id', roleIds);
    (roles || []).forEach((r: any) => { roleMap[r.id] = r.name; });
  }
  const map = new Map<string, any>();
  (data || []).forEach((p: any) => {
    map.set(p.user_id, { ...p, role_name: p.role ? roleMap[p.role] || null : null });
  });
  return map;
}

/**
 * Resolve one canonical role label to the list of user_ids that hold it for
 * this project (PTM override → scoped roster → org fallback).
 */
async function resolveHoldersForLabels(
  projectId: string,
  labels: readonly string[],
): Promise<Map<string, string[]>> {
  const c = supabase as any;
  const out = new Map<string, string[]>();
  if (!labels.length) return out;

  const { data: roleRows } = await c
    .from('roles')
    .select('id, name, scope')
    .in('name', labels as unknown as string[])
    .eq('is_active', true)
    .eq('is_retired', false);

  const proj = await c
    .from('projects')
    .select('region_id, hub_id, plant_id')
    .eq('id', projectId)
    .maybeSingle();
  const p = proj.data || {};

  for (const label of labels) {
    const roleRow = (roleRows || []).find((r: any) => r.name === label);
    if (!roleRow) { out.set(label, []); continue; }

    // 1) PTM override
    const ptm = await c
      .from('project_team_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('role', label);
    let userIds: string[] = (ptm.data || []).map((r: any) => r.user_id);

    // 2) roster
    if (userIds.length === 0) {
      if (roleRow.scope === 'portfolio' && p.region_id) {
        const r = await c.from('region_role_holders').select('user_id')
          .eq('region_id', p.region_id).eq('role_id', roleRow.id);
        userIds = (r.data || []).map((x: any) => x.user_id);
      } else if (roleRow.scope === 'hub' && p.hub_id) {
        const r = await c.from('hub_role_holders').select('user_id')
          .eq('hub_id', p.hub_id).eq('role_id', roleRow.id);
        userIds = (r.data || []).map((x: any) => x.user_id);
      } else if (roleRow.scope === 'plant' && p.plant_id) {
        const r = await c.from('plant_role_holders').select('user_id')
          .eq('plant_id', p.plant_id).eq('role_id', roleRow.id);
        userIds = (r.data || []).map((x: any) => x.user_id);
      }
    }

    // 3) org fallback
    if (userIds.length === 0) {
      const r = await c.from('org_role_holders').select('user_id').eq('role_id', roleRow.id);
      userIds = (r.data || []).map((x: any) => x.user_id);
    }

    out.set(label, userIds);
  }
  return out;
}

/* ---------------- Hook ---------------- */

export function useVCRPartiesRollup(
  handoverPointId: string | null | undefined,
  projectId?: string | null,
) {
  return useQuery({
    queryKey: ['vcr-parties-rollup', handoverPointId, projectId || null],
    enabled: !!handoverPointId,
    staleTime: 30_000,
    queryFn: async (): Promise<PartiesRollup> => {
      const empty: PartiesRollup = {
        delivering: [], approving: [], sof: [], pac: [],
        deliveringByPrereq: {}, approvingByPrereq: {},
      };
      if (!handoverPointId) return empty;
      const c = supabase as any;

      // 1) Prereqs with linked vcr_item.delivering_party_role_id + role name
      const { data: prereqs } = await c
        .from('p2a_vcr_prerequisites')
        .select(`
          id, status, summary, vcr_item_id,
          vcr_items:vcr_item_id (
            id,
            delivering_party_role_id,
            delivering_role:roles!vcr_items_delivering_party_role_id_fkey ( id, name )
          )
        `)
        .eq('handover_point_id', handoverPointId);

      const prereqStatus = new Map<string, string>();
      const prereqSummary = new Map<string, string>();
      const prereqDeliveringLabel = new Map<string, string | null>();
      (prereqs || []).forEach((p: any) => {
        prereqStatus.set(p.id, p.status);
        prereqSummary.set(p.id, p.summary);
        prereqDeliveringLabel.set(p.id, p.vcr_items?.delivering_role?.name ?? null);
      });
      const prereqIds = [...prereqStatus.keys()];

      // 2) Approving parties (unchanged: TA2 approvals)
      let approvingRows: any[] = [];
      if (prereqIds.length > 0) {
        const { data } = await c
          .from('vcr_prerequisite_approvals')
          .select('approver_user_id, prerequisite_id, status')
          .in('prerequisite_id', prereqIds);
        approvingRows = data || [];
      }

      // 3) SoF/PAC signed overlay
      const { data: sofRows } = await c
        .from('vcr_sof_approvers')
        .select('user_id, approver_role, status, signed_at')
        .eq('handover_point_id', handoverPointId);
      const signedByUser = new Map<string, { signed: boolean; signed_at: string | null }>();
      (sofRows || []).forEach((r: any) => {
        if (r.user_id) signedByUser.set(r.user_id, {
          signed: r.status === 'SIGNED',
          signed_at: r.signed_at ?? null,
        });
      });

      // 4) Resolve delivering-role holders per project
      let deliveringHoldersByLabel = new Map<string, string[]>();
      if (projectId) {
        const uniqueLabels = [
          ...new Set(
            [...prereqDeliveringLabel.values()].filter((x): x is string => !!x),
          ),
        ];
        deliveringHoldersByLabel = await resolveHoldersForLabels(projectId, uniqueLabels);
      }

      // Build delivering per-user rollup + per-prereq name index
      const deliveringByUser = new Map<string, PartyItem[]>();
      const deliveringByPrereq: Record<string, string[]> = {};
      const allDeliveringUserIds = new Set<string>();

      for (const [prereqId, label] of prereqDeliveringLabel.entries()) {
        if (!label) continue;
        const holders = deliveringHoldersByLabel.get(label) || [];
        for (const uid of holders) {
          allDeliveringUserIds.add(uid);
          const list = deliveringByUser.get(uid) || [];
          list.push({
            prereq_id: prereqId,
            summary: prereqSummary.get(prereqId) || '',
            status: prereqStatus.get(prereqId) || '',
          });
          deliveringByUser.set(uid, list);
        }
      }

      // 5) SoF + PAC canonical resolution
      const sofHoldersByLabel = projectId
        ? await resolveHoldersForLabels(projectId, SOF_ROLE_LABELS)
        : new Map<string, string[]>();
      const pacHoldersByLabel = projectId
        ? await resolveHoldersForLabels(projectId, PAC_ROLE_LABELS)
        : new Map<string, string[]>();

      const sofUserRoleLabel = new Map<string, string>();
      SOF_ROLE_LABELS.forEach((lbl) => {
        (sofHoldersByLabel.get(lbl) || []).forEach((uid) => {
          if (!sofUserRoleLabel.has(uid)) sofUserRoleLabel.set(uid, lbl);
        });
      });
      const pacUserRoleLabel = new Map<string, string>();
      PAC_ROLE_LABELS.forEach((lbl) => {
        (pacHoldersByLabel.get(lbl) || []).forEach((uid) => {
          if (!pacUserRoleLabel.has(uid)) pacUserRoleLabel.set(uid, lbl);
        });
      });

      // 6) Resolve every profile in one shot
      const allUserIds = new Set<string>([
        ...allDeliveringUserIds,
        ...approvingRows.map((r: any) => r.approver_user_id).filter(Boolean),
        ...sofUserRoleLabel.keys(),
        ...pacUserRoleLabel.keys(),
      ]);
      const profileMap = await resolveProfiles([...allUserIds]);

      /* -------- Delivering party rows -------- */
      const delivering: PartyPerson[] = [...deliveringByUser.entries()]
        .map(([user_id, items]) => {
          const profile = profileMap.get(user_id);
          const completed = items.filter((it) => TERMINAL_STATUSES.has(it.status)).length;
          items.forEach((it) => {
            const arr = deliveringByPrereq[it.prereq_id] || [];
            const nm = profile?.full_name || 'Unknown';
            if (!arr.includes(nm)) arr.push(nm);
            deliveringByPrereq[it.prereq_id] = arr;
          });
          return {
            user_id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url ?? null,
            position: profile?.position ?? null,
            role_name: profile?.role_name ?? null,
            assigned: items.length,
            completed,
            items,
          } as PartyPerson;
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      /* -------- Approving party rows -------- */
      const approvingByUser = new Map<string, PartyItem[]>();
      const approvingCompletedByUser = new Map<string, Set<string>>();
      const approvingByPrereq: Record<string, string[]> = {};

      approvingRows.forEach((r: any) => {
        if (!r.approver_user_id) return;
        const uid = r.approver_user_id;
        const list = approvingByUser.get(uid) || [];
        list.push({
          prereq_id: r.prerequisite_id,
          summary: prereqSummary.get(r.prerequisite_id) || '',
          status: prereqStatus.get(r.prerequisite_id) || '',
        });
        approvingByUser.set(uid, list);
        if (APPROVED_APPROVAL_STATUSES.has(r.status || '')) {
          const s = approvingCompletedByUser.get(uid) || new Set<string>();
          s.add(r.prerequisite_id);
          approvingCompletedByUser.set(uid, s);
        }
      });
      const approving: PartyPerson[] = [...approvingByUser.entries()]
        .map(([user_id, items]) => {
          const profile = profileMap.get(user_id);
          // de-dupe items (an approver can appear on the same prereq more than once)
          const seen = new Set<string>();
          const dedup: PartyItem[] = [];
          items.forEach((it) => {
            if (seen.has(it.prereq_id)) return;
            seen.add(it.prereq_id);
            dedup.push(it);
            const arr = approvingByPrereq[it.prereq_id] || [];
            const nm = profile?.full_name || 'Unknown';
            if (!arr.includes(nm)) arr.push(nm);
            approvingByPrereq[it.prereq_id] = arr;
          });
          return {
            user_id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url ?? null,
            position: profile?.position ?? null,
            role_name: profile?.role_name ?? null,
            assigned: dedup.length,
            completed: approvingCompletedByUser.get(user_id)?.size ?? 0,
            items: dedup,
          } as PartyPerson;
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      /* -------- SoF / PAC rows (role-holder resolved) -------- */
      const buildRoleBased = (
        userRoleLabels: Map<string, string>,
      ): PartyPerson[] =>
        [...userRoleLabels.entries()].map(([user_id, label]) => {
          const profile = profileMap.get(user_id);
          const sig = signedByUser.get(user_id);
          return {
            user_id,
            full_name: profile?.full_name || label,
            avatar_url: profile?.avatar_url ?? null,
            position: profile?.position ?? null,
            role_name: label,
            assigned: 1,
            completed: sig?.signed ? 1 : 0,
            items: [],
            signed: sig?.signed ?? false,
            signed_at: sig?.signed_at ?? null,
          } as PartyPerson;
        });

      const sof = buildRoleBased(sofUserRoleLabel);
      const pac = buildRoleBased(pacUserRoleLabel);

      return { delivering, approving, sof, pac, deliveringByPrereq, approvingByPrereq };
    },
  });
}
