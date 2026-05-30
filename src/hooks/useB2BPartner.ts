import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * Back-to-back (B2B) partner resolver.
 *
 * Rule (per product decision): two active users with the EXACT same
 * normalized `profiles.position` string are treated as B2B partners.
 * If exactly two users share a position, the other one is the partner.
 * If 0, 1, or 3+ users share it, there is no inferred partner.
 *
 * The partner's user_id is folded into "tasks assigned to me" queries so
 * either person sees and can close the action. Closing a single shared
 * task row implicitly closes it for both.
 */

const normalize = (p?: string | null) =>
  (p || '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function fetchB2BPartnerIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('position, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  if (meErr || !me) return [];

  const pos = normalize(me.position);
  if (!pos) return [];

  const { data: peers, error: peersErr } = await supabase
    .from('profiles')
    .select('user_id, position, is_active')
    .eq('is_active', true);
  if (peersErr || !peers) return [];

  const sharing = peers.filter(
    (p: any) => normalize(p.position) === pos && p.user_id
  );
  // Only treat as B2B when exactly 2 users share the unique position.
  if (sharing.length !== 2) return [];
  return sharing
    .map((p: any) => p.user_id as string)
    .filter((id) => id && id !== userId);
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
    queryKey: ['b2b-partner', userId],
    queryFn: () => fetchB2BPartnerIds(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // positions rarely change
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
