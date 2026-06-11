import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * Back-to-back (B2B) partner resolver — Part D (structured, is_b2b-gated).
 *
 * RULE
 *   Pairing is resolved from the structured role-holder tables, NOT from
 *   profiles.position string matches. For each role the current user holds,
 *   we look up the OTHER active holders at the same scope key:
 *     • portfolio  → (role_id, region_id)         via region_role_holders
 *     • plant      → (role_id, plant_id, COALESCE(field_id, sentinel))
 *                                                 via plant_role_holders
 *     • hub        → (role_id, hub_id)            via hub_role_holders
 *     • org        → (role_id)                    via org_role_holders
 *     • project    → (role_id, project_id)        via project_team_members
 *
 *   The plant scope key uses the SAME COALESCE(field_id, '00..0'::uuid)
 *   expression as plant_role_holders_pair_lookup — two NULL-field rows pair
 *   (e.g. KAZ Ops Coaches), but a NULL-field row NEVER pairs with a populated
 *   row (a KAZ coach and a Zubair coach are different scopes).
 *
 *   A holding only counts toward pairing if `roles.is_b2b = true`. If
 *   exactly ONE other user shares the scope key → that user is the partner.
 *   Zero (solo) or 2+ (ambiguous) others → no inferred partner.
 *
 * EFFECT
 *   The partner's user_id is folded into "tasks assigned to me" queries so
 *   either person sees and can close the action. The display position string
 *   becomes purely cosmetic; resolution is structured.
 */

const SENTINEL_UUID = '00000000-0000-0000-0000-000000000000';

type Holding =
  | { kind: 'org'; role_id: string }
  | { kind: 'region'; role_id: string; region_id: string }
  | { kind: 'plant'; role_id: string; plant_id: string; field_id: string | null }
  | { kind: 'hub'; role_id: string; hub_id: string }
  | { kind: 'project'; role_name: string; project_id: string };

export async function fetchB2BPartnerIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  // 1) Pull this user's holdings from every structured table in parallel.
  const [orgRes, regionRes, plantRes, hubRes, projRes] = await Promise.all([
    supabase.from('org_role_holders').select('role_id').eq('user_id', userId),
    supabase.from('region_role_holders').select('role_id, region_id').eq('user_id', userId),
    supabase
      .from('plant_role_holders')
      .select('role_id, plant_id, field_id')
      .eq('user_id', userId),
    supabase.from('hub_role_holders').select('role_id, hub_id').eq('user_id', userId),
    supabase.from('project_team_members').select('role, project_id').eq('user_id', userId),
  ]);

  const holdings: Holding[] = [];
  for (const r of orgRes.data ?? []) holdings.push({ kind: 'org', role_id: r.role_id as string });
  for (const r of regionRes.data ?? [])
    holdings.push({ kind: 'region', role_id: r.role_id as string, region_id: r.region_id as string });
  for (const r of plantRes.data ?? [])
    holdings.push({
      kind: 'plant',
      role_id: r.role_id as string,
      plant_id: r.plant_id as string,
      field_id: (r as any).field_id ?? null,
    });
  for (const r of hubRes.data ?? [])
    holdings.push({ kind: 'hub', role_id: r.role_id as string, hub_id: r.hub_id as string });
  for (const r of projRes.data ?? []) {
    if (!r.role || !r.project_id) continue;
    holdings.push({ kind: 'project', role_name: r.role as string, project_id: r.project_id as string });
  }

  if (holdings.length === 0) return [];

  // 2) Resolve is_b2b for every role referenced — by id for structured
  //    tables, by name for project_team_members.role (text column).
  const roleIdsNeeded = new Set<string>();
  const roleNamesNeeded = new Set<string>();
  for (const h of holdings) {
    if (h.kind === 'project') roleNamesNeeded.add(h.role_name);
    else roleIdsNeeded.add(h.role_id);
  }

  const [byIdRes, byNameRes] = await Promise.all([
    roleIdsNeeded.size
      ? supabase.from('roles').select('id, name, is_b2b').in('id', [...roleIdsNeeded])
      : Promise.resolve({ data: [] as any[] }),
    roleNamesNeeded.size
      ? supabase.from('roles').select('id, name, is_b2b').in('name', [...roleNamesNeeded])
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const isB2BById = new Map<string, boolean>();
  const isB2BByName = new Map<string, boolean>();
  for (const r of byIdRes.data ?? []) isB2BById.set(r.id as string, r.is_b2b === true);
  for (const r of byNameRes.data ?? []) isB2BByName.set(r.name as string, r.is_b2b === true);

  // 3) For each B2B holding, look up co-holders at the same scope key.
  //    "Pair" = exactly one OTHER user (total holders = 2).
  const partners = new Set<string>();

  const lookups = holdings.map(async (h) => {
    const flagged =
      h.kind === 'project'
        ? isB2BByName.get(h.role_name) === true
        : isB2BById.get(h.role_id) === true;
    if (!flagged) return;

    if (h.kind === 'org') {
      const { data } = await supabase
        .from('org_role_holders')
        .select('user_id')
        .eq('role_id', h.role_id);
      acceptPair(data ?? [], userId, partners);
    } else if (h.kind === 'region') {
      const { data } = await supabase
        .from('region_role_holders')
        .select('user_id')
        .eq('role_id', h.role_id)
        .eq('region_id', h.region_id);
      acceptPair(data ?? [], userId, partners);
    } else if (h.kind === 'hub') {
      const { data } = await supabase
        .from('hub_role_holders')
        .select('user_id')
        .eq('role_id', h.role_id)
        .eq('hub_id', h.hub_id);
      acceptPair(data ?? [], userId, partners);
    } else if (h.kind === 'plant') {
      // PostgREST can't express COALESCE in a filter, so we narrow by
      // (role_id, plant_id) and apply the COALESCE(field_id, SENTINEL)
      // equality client-side — same expression as the DB lookup index.
      const { data } = await supabase
        .from('plant_role_holders')
        .select('user_id, field_id')
        .eq('role_id', h.role_id)
        .eq('plant_id', h.plant_id);
      const myKey = h.field_id ?? SENTINEL_UUID;
      const matching = (data ?? []).filter(
        (r: any) => ((r.field_id as string | null) ?? SENTINEL_UUID) === myKey,
      );
      acceptPair(matching, userId, partners);
    } else if (h.kind === 'project') {
      const { data } = await supabase
        .from('project_team_members')
        .select('user_id')
        .eq('project_id', h.project_id)
        .eq('role', h.role_name);
      acceptPair(data ?? [], userId, partners);
    }
  });

  await Promise.all(lookups);

  partners.delete(userId);
  return [...partners];
}

/**
 * acceptPair — fold a candidate scope's holders into the partner set if and
 * only if exactly ONE other user holds the same scope. Zero (solo) or 2+
 * (ambiguous) → contributes nothing.
 */
function acceptPair(
  rows: Array<{ user_id: string | null }>,
  selfId: string,
  out: Set<string>,
): void {
  const others = rows
    .map((r) => r.user_id)
    .filter((id): id is string => !!id && id !== selfId);
  if (others.length === 1) out.add(others[0]);
}

/**
 * Hook variant — returns { partnerIds, effectiveUserIds } where
 * effectiveUserIds = [currentUserId, ...partnerIds]. Use this in any
 * "tasks assigned to me" query to also surface the partner's open tasks.
 */
export function useB2BPartner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ['b2b-partner-structured', userId],
    queryFn: () => fetchB2BPartnerIds(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // role assignments rarely change
    refetchOnWindowFocus: false,
  });

  const partnerIds = query.data || [];
  const effectiveUserIds = userId ? [userId, ...partnerIds] : [];

  return {
    partnerIds,
    effectiveUserIds,
    isLoading: query.isLoading,
  };
}
