import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getRoleFamilyNames } from '@/utils/hubRegionMapping';

/**
 * Shared resolver: who currently holds an approving-party role?
 *
 * SINGLE source of truth — the VCR item editor and the PSSR item editor
 * both call this. The resolver always reads `org_role_holders` FIRST so
 * any seeded global / B2B holder change (Mig 20260603053417 + cap-2)
 * propagates to both editors instantly, without each editor running its
 * own private profiles+position lookup.
 *
 * Per role:
 *   1) If `org_role_holders` has 1..2 rows for that role → those are the
 *      authoritative holders (B2B pair returns BOTH; display layer keeps
 *      its existing "same normalized position ⇒ collapse to one badged
 *      card" rule, since seeded pairs share their position string).
 *   2) Otherwise → fall back to the existing profiles-by-role filter
 *      (with optional role-family expansion for VCR and optional
 *      location/plant filter for either editor). This keeps per-project
 *      / non-global roles working exactly as today.
 *
 * The hook deliberately does NOT compute the B2B-collapse here — display
 * components (VCRItemsStep, PSSRItemDetailSheet) already share the
 * identical-position detector, and we don't want two paths for that.
 */

export interface ResolvedHolder {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  position: string | null;
  role_id: string;
  role_name: string;
  /** 'org' = came from org_role_holders, 'profile' = fallback profile lookup. */
  source: 'org' | 'profile';
}

export interface UseApprovingPartyHoldersArgs {
  /** Roles catalog (id+name) — pass the already-fetched list from the editor. */
  roles: Array<{ id: string; name: string }>;
  /** Either roleIds or roleNames must be provided. */
  roleIds?: string[];
  roleNames?: string[];
  /** VCR uses role-family expansion (e.g. ORA Engr ⇒ Snr ORA Engr) for fallback. */
  expandFamily?: boolean;
  /** Optional fallback-only filter (e.g. project-location or plant match). */
  fallbackFilter?: (profile: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    position: string | null;
    role: string;
    hub?: string | null;
  }, roleName: string) => boolean;
  /** Stable key fragment (e.g. project id / plant name) so caches don't bleed. */
  scopeKey?: string;
  enabled?: boolean;
}

interface RoleSpec {
  role_id: string;
  role_name: string;
}

async function fetchHoldersForRoles(
  specs: RoleSpec[],
  opts: { expandFamily: boolean; rolesCatalog: Array<{ id: string; name: string }>; fallbackFilter?: UseApprovingPartyHoldersArgs['fallbackFilter'] },
): Promise<Record<string, ResolvedHolder[]>> {
  if (specs.length === 0) return {};

  const result: Record<string, ResolvedHolder[]> = {};
  const fallbackSpecs: RoleSpec[] = [];

  // 1) org_role_holders — authoritative
  const { data: orhRows } = await supabase
    .from('org_role_holders')
    .select('role_id, user_id')
    .in('role_id', specs.map(s => s.role_id));

  const orhByRole = new Map<string, string[]>();
  (orhRows || []).forEach((r: any) => {
    const list = orhByRole.get(r.role_id) || [];
    list.push(r.user_id);
    orhByRole.set(r.role_id, list);
  });

  const orgUserIds = [...new Set((orhRows || []).map((r: any) => r.user_id as string))];
  let orgProfiles: any[] = [];
  if (orgUserIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, position')
      .in('user_id', orgUserIds);
    orgProfiles = data || [];
  }
  const profById = new Map<string, any>();
  orgProfiles.forEach(p => profById.set(p.user_id, p));

  for (const spec of specs) {
    const uids = orhByRole.get(spec.role_id);
    if (uids && uids.length > 0) {
      result[spec.role_id] = uids.map(uid => {
        const p = profById.get(uid);
        return {
          user_id: uid,
          full_name: p?.full_name || '',
          avatar_url: p?.avatar_url ?? null,
          position: p?.position ?? null,
          role_id: spec.role_id,
          role_name: spec.role_name,
          source: 'org' as const,
        };
      });
    } else {
      fallbackSpecs.push(spec);
      result[spec.role_id] = [];
    }
  }

  // 2) profile-position fallback — only for roles with no org_role_holders row
  if (fallbackSpecs.length > 0) {
    // Optional role-family expansion (VCR behaviour)
    const expandedRoleIdByOriginal = new Map<string, Set<string>>();
    fallbackSpecs.forEach(spec => {
      const set = new Set<string>([spec.role_id]);
      if (opts.expandFamily) {
        const fam = getRoleFamilyNames(spec.role_name);
        opts.rolesCatalog.forEach(r => { if (fam.includes(r.name)) set.add(r.id); });
      }
      expandedRoleIdByOriginal.set(spec.role_id, set);
    });
    const allExpanded = [...new Set([...expandedRoleIdByOriginal.values()].flatMap(s => [...s]))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, role, position, hub')
      .in('role', allExpanded)
      .eq('is_active', true);

    const profilesList = profiles || [];
    for (const spec of fallbackSpecs) {
      const allowedRoleIds = expandedRoleIdByOriginal.get(spec.role_id)!;
      const matched = profilesList.filter((p: any) => {
        if (!allowedRoleIds.has(p.role)) return false;
        if (opts.fallbackFilter && !opts.fallbackFilter(p, spec.role_name)) return false;
        return true;
      });
      result[spec.role_id] = matched.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name || '',
        avatar_url: p.avatar_url ?? null,
        position: p.position ?? null,
        role_id: p.role,
        role_name: spec.role_name,
        source: 'profile' as const,
      }));
    }
  }

  return result;
}

/**
 * Resolve holders keyed by role_id. Used by VCR (its approving_party_role_ids
 * are role-id arrays).
 */
export function useApprovingPartyHoldersByIds(args: UseApprovingPartyHoldersArgs) {
  const { roles, roleIds = [], expandFamily = false, fallbackFilter, scopeKey, enabled = true } = args;
  const specs: RoleSpec[] = roleIds
    .map(id => {
      const r = roles.find(x => x.id === id);
      return r ? { role_id: r.id, role_name: r.name } : null;
    })
    .filter(Boolean) as RoleSpec[];

  return useQuery({
    queryKey: ['approving-party-holders-by-ids', specs.map(s => s.role_id).sort().join(','), expandFamily, scopeKey ?? null],
    queryFn: () => fetchHoldersForRoles(specs, { expandFamily, rolesCatalog: roles, fallbackFilter }),
    enabled: enabled && specs.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Resolve holders keyed by role NAME (case-insensitive). Used by PSSR
 * (its approvers field is a comma-separated role-name string).
 */
export function useApprovingPartyHoldersByNames(
  args: Omit<UseApprovingPartyHoldersArgs, 'roleIds'> & { roleNames: string[] },
) {
  const { roles, roleNames, expandFamily = false, fallbackFilter, scopeKey, enabled = true } = args;
  const specs: RoleSpec[] = roleNames
    .map(name => {
      const r = roles.find(x => x.name.toLowerCase() === name.toLowerCase());
      return r ? { role_id: r.id, role_name: r.name } : null;
    })
    .filter(Boolean) as RoleSpec[];

  const query = useQuery({
    queryKey: ['approving-party-holders-by-names', specs.map(s => s.role_id).sort().join(','), expandFamily, scopeKey ?? null],
    queryFn: () => fetchHoldersForRoles(specs, { expandFamily, rolesCatalog: roles, fallbackFilter }),
    enabled: enabled && specs.length > 0,
    staleTime: 60_000,
  });

  // Re-key by the original role name string the caller passed in (preserves case).
  const byName: Record<string, ResolvedHolder[]> = {};
  if (query.data) {
    roleNames.forEach(name => {
      const spec = specs.find(s => s.role_name.toLowerCase() === name.toLowerCase());
      byName[name] = spec ? (query.data[spec.role_id] || []) : [];
    });
  }
  return { ...query, data: byName };
}
