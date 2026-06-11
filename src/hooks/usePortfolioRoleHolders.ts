/**
 * Portfolio role-holder I/O hooks.
 *
 * Single source of truth for the user-management UI to read and write
 * `region_role_holders` rows for portfolio-scoped roles (Snr ORA Engr,
 * Construction Lead, Commissioning Lead, ORA Engr, Project Manager).
 *
 * Resolution is LIVE-READ (the per-project resolver
 * `resolve_project_role_user` reads region_role_holders by role_id +
 * region_id at query time), so changing a row here reassigns the holder
 * across every project in that region with NO per-project edits and NO
 * resync — that's the M11/STEP-3 acceptance contract.
 *
 * profiles.position is a DISPLAY label only and is NOT touched here.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegionOption {
  id: string;
  name: string;
}

export interface PortfolioRoleAssignment {
  role_id: string;
  role_name: string;
  region_id: string;
  region_name: string;
}

/** All available portfolios (regions) — used to populate the multi-select. */
export function useAvailableRegions() {
  return useQuery({
    queryKey: ['available-regions'],
    queryFn: async (): Promise<RegionOption[]> => {
      const { data, error } = await supabase
        .from('project_region')
        .select('id,name')
        .order('name');
      if (error) throw error;
      return (data ?? []) as RegionOption[];
    },
  });
}

/**
 * Every portfolio assignment a given user currently holds (across all
 * portfolio-scoped roles). Filter client-side by role_id for per-role UI.
 */
export function useUserPortfolioAssignments(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['user-portfolio-assignments', userId],
    queryFn: async (): Promise<PortfolioRoleAssignment[]> => {
      const { data, error } = await (supabase.rpc as any)(
        'get_user_region_role_holders',
        { p_user_id: userId },
      );
      if (error) throw error;
      return (data ?? []) as PortfolioRoleAssignment[];
    },
  });
}

/**
 * Preflight read of current holders for (role, region) — used by the
 * UI to detect the B2B cap-2 before submission and to populate the
 * "choose who they replace" picker.
 */
export interface RegionRoleHolder {
  user_id: string;
  full_name: string;
}

export async function fetchRegionRoleHoldersPreflight(
  roleId: string,
  regionId: string,
): Promise<RegionRoleHolder[]> {
  const { data, error } = await (supabase.rpc as any)(
    'get_region_role_holders_preflight',
    { p_role_id: roleId, p_region_id: regionId },
  );
  if (error) throw error;
  return (data ?? []) as RegionRoleHolder[];
}

/**
 * Atomically overwrite the set of regions a user holds for ONE
 * portfolio-scoped role. Admin-only (enforced server-side).
 *
 * When the target region already has a complete B2B pair, pass
 * `replaceUserId` + `replaceRegionId` to atomically swap an existing
 * holder in the same transaction (the cap-2 trigger sees a consistent
 * state). The trigger raises a human-readable `B2B_CAP_REACHED: ...`
 * message if the cap would be exceeded without a replacement.
 */
export function useSetPortfolioAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      roleId: string;
      regionIds: string[];
      replaceUserId?: string | null;
      replaceRegionId?: string | null;
    }) => {
      const { error } = await (supabase.rpc as any)(
        'set_user_region_role_holders_v2',
        {
          p_user_id: vars.userId,
          p_role_id: vars.roleId,
          p_region_ids: vars.regionIds,
          p_replace_user_id: vars.replaceUserId ?? null,
          p_replace_region_id: vars.replaceRegionId ?? null,
        },
      );
      if (error) {
        const msg = (error.message || '').replace(/^B2B_CAP_REACHED:\s*/, '');
        throw new Error(msg || 'Failed to save portfolio assignment');
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['user-portfolio-assignments', vars.userId] });
      qc.invalidateQueries({ queryKey: ['project-role-user'] });
      qc.invalidateQueries({ queryKey: ['project-role-users'] });
      qc.invalidateQueries({ queryKey: ['project-role-holders'] });
    },
  });
}
