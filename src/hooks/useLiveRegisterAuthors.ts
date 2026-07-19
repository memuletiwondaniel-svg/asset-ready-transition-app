import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Live-resolves the register author for rows that carry an `author_role_id`.
 *
 * The stored `responsible_person` (a plain text name) is kept only as a
 * fallback — when a role pointer is set, the display should always reflect
 * the current holder of that role for the register's project, mirroring the
 * maintenance-deliverable pointer pattern.
 *
 * Returns a Map keyed by register row id → resolved full name (or null).
 */
export interface LiveAuthoredRow {
  id: string;
  author_role_id?: string | null;
  handover_point_id?: string | null;
}

export function useLiveRegisterAuthors(rows: LiveAuthoredRow[] | undefined | null) {
  const keys = (rows || [])
    .filter((r) => r.author_role_id && r.handover_point_id)
    .map((r) => `${r.handover_point_id}:${r.author_role_id}`);
  const cacheKey = keys.sort().join('|');

  return useQuery<Map<string, string | null>>({
    queryKey: ['live-register-authors', cacheKey],
    enabled: keys.length > 0,
    queryFn: async () => {
      const map = new Map<string, string | null>();
      if (!rows || rows.length === 0) return map;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      // Resolve project_id for each unique handover_point_id.
      const vcrIds = Array.from(
        new Set(rows.filter((r) => r.author_role_id).map((r) => r.handover_point_id!).filter(Boolean)),
      );
      if (vcrIds.length === 0) return map;

      const { data: vcrs } = await client
        .from('p2a_handover_points')
        .select('id, plan:p2a_handover_plans!p2a_handover_points_handover_plan_id_fkey(project_id)')
        .in('id', vcrIds);
      const projectByVcr = new Map<string, string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vcrs || []).map((v: any) => [v.id, v.plan?.project_id]).filter((e: any) => e[1]),
      );

      // Resolve holder user_id per unique (project_id, role_id) pair.
      const pairs = new Map<string, { project_id: string; role_id: string }>();
      for (const r of rows) {
        if (!r.author_role_id || !r.handover_point_id) continue;
        const project_id = projectByVcr.get(r.handover_point_id);
        if (!project_id) continue;
        pairs.set(`${project_id}:${r.author_role_id}`, { project_id, role_id: r.author_role_id });
      }

      const holderByPair = new Map<string, string | null>();
      await Promise.all(
        Array.from(pairs.entries()).map(async ([k, { project_id, role_id }]) => {
          const { data } = await client.rpc('resolve_role_holder', {
            p_project_id: project_id,
            p_role_id: role_id,
          });
          holderByPair.set(k, (data as string | null) ?? null);
        }),
      );

      // Load profile names for resolved holders.
      const holderIds = Array.from(new Set(Array.from(holderByPair.values()).filter(Boolean))) as string[];
      const nameById = new Map<string, string | null>();
      if (holderIds.length > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', holderIds);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profiles || []).forEach((p: any) => nameById.set(p.user_id, p.full_name));
      }

      for (const r of rows) {
        if (!r.author_role_id || !r.handover_point_id) continue;
        const project_id = projectByVcr.get(r.handover_point_id);
        if (!project_id) continue;
        const holder = holderByPair.get(`${project_id}:${r.author_role_id}`);
        map.set(r.id, holder ? nameById.get(holder) ?? null : null);
      }
      return map;
    },
  });
}
