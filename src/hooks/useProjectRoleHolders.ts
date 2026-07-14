import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Multi-holder resolver for a canonical role on a project.
 *
 * Mirrors the precedence used by `resolve_project_role_user`, but returns
 * the FULL list of holders (not just the first), so the UI can render
 * back-to-back pairs (e.g. North has Azamat + Beibit on Snr ORA Engr).
 *
 * Precedence:
 *   1. project_team_members rows for (project, role) — explicit per-project override
 *   2. roster table matching role scope:
 *        portfolio → region_role_holders (project.region_id, role_id)
 *        hub       → hub_role_holders    (project.hub_id, role_id)
 *        plant     → plant_role_holders  (project.plant_id, role_id)
 *   3. org_role_holders (role_id)
 *
 * Role labels MUST be byte-identical to `roles.name`.
 */
export interface RoleHolder {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  source: 'override' | 'roster' | 'org';
}

async function fetchHolders(
  projectId: string,
  label: string,
): Promise<RoleHolder[]> {
  const c = supabase as any;

  const roleRes = await c
    .from('roles')
    .select('id, scope')
    .eq('name', label)
    .eq('is_active', true)
    .eq('is_retired', false)
    .maybeSingle();
  const roleRow = roleRes.data;
  if (!roleRow) return [];

  // 1. PTM overrides
  const ptmRes = await c
    .from('project_team_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('role', label);
  let userIds: string[] = (ptmRes.data || []).map((r: any) => r.user_id);
  let source: RoleHolder['source'] = 'override';

  // 2. Roster fall-through
  if (userIds.length === 0) {
    const projRes = await c
      .from('projects')
      .select('region_id, hub_id, plant_id')
      .eq('id', projectId)
      .single();
    const proj = projRes.data;
    if (proj) {
      source = 'roster';
      if (roleRow.scope === 'portfolio' && proj.region_id) {
        const r = await c
          .from('region_role_holders')
          .select('user_id')
          .eq('region_id', proj.region_id)
          .eq('role_id', roleRow.id);
        userIds = (r.data || []).map((x: any) => x.user_id);
      } else if (roleRow.scope === 'hub' && proj.hub_id) {
        const r = await c
          .from('hub_role_holders')
          .select('user_id')
          .eq('hub_id', proj.hub_id)
          .eq('role_id', roleRow.id);
        userIds = (r.data || []).map((x: any) => x.user_id);
      } else if (roleRow.scope === 'plant' && proj.plant_id) {
        const r = await c
          .from('plant_role_holders')
          .select('user_id')
          .eq('plant_id', proj.plant_id)
          .eq('role_id', roleRow.id);
        userIds = (r.data || []).map((x: any) => x.user_id);
      }
    }
  }

  // 3. Org fall-through
  if (userIds.length === 0) {
    source = 'org';
    const r = await c
      .from('org_role_holders')
      .select('user_id')
      .eq('role_id', roleRow.id);
    userIds = (r.data || []).map((x: any) => x.user_id);
  }

  if (userIds.length === 0) return [];

  const profiles = await Promise.all(
    userIds.map(async (uid) => {
      const p = await c.rpc('get_safe_profile_data', { target_user_id: uid });
      const row = Array.isArray(p.data) ? p.data[0] : p.data;
      return {
        user_id: uid,
        full_name: (row?.full_name as string) || label,
        avatar_url: (row?.avatar_url as string | undefined) ?? null,
        email: (row?.email as string | undefined) ?? null,
        source,
      } as RoleHolder;
    }),
  );

  return profiles;
}

export function useProjectRoleHolders(
  projectId: string | undefined,
  labels: readonly string[],
) {
  const key = [...labels].sort().join('|');
  return useQuery({
    enabled: !!projectId && labels.length > 0,
    queryKey: ['project-role-holders', projectId, key],
    queryFn: async (): Promise<Record<string, RoleHolder[]>> => {
      const entries = await Promise.all(
        labels.map(
          async (l) => [l, await fetchHolders(projectId!, l)] as const,
        ),
      );
      return Object.fromEntries(entries);
    },
  });
}
