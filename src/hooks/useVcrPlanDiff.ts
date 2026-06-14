import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeVcrPlanDiff, type VcrSnapshotLike } from '@/lib/vcrPlanDiff';

export type DiffMode = 'live' | 'baseline';

interface UseVcrPlanDiffResult {
  diff: ReturnType<typeof computeVcrPlanDiff> | null;
  from: VcrSnapshotLike | null;
  to: VcrSnapshotLike | null;
  fromMissing: boolean;
  toMissing: boolean;
  loading: boolean;
  /** id → human label for active_vcr_item_ids resolution */
  itemNames: Record<string, string>;
}

export function useVcrPlanDiff(
  handoverPointId: string | null | undefined,
  opts: { mode: DiffMode } = { mode: 'live' },
): UseVcrPlanDiffResult {
  const mode = opts.mode;

  // FROM = latest non-voided submitter snapshot
  const fromQ = useQuery({
    queryKey: ['vcr-plan-snapshot-from', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_snapshots')
        .select('snapshot')
        .eq('handover_point_id', handoverPointId)
        .eq('kind', 'submitter')
        .is('voided_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.snapshot as VcrSnapshotLike) ?? null;
    },
  });

  // TO = live RPC OR baseline snapshot
  const toQ = useQuery({
    queryKey: ['vcr-plan-snapshot-to', handoverPointId, mode],
    enabled: !!handoverPointId,
    queryFn: async (): Promise<VcrSnapshotLike | null> => {
      if (mode === 'live') {
        const { data, error } = await (supabase as any).rpc('vcr_plan_live_snapshot', {
          p_handover_point_id: handoverPointId,
        });
        if (error) throw error;
        return (data as VcrSnapshotLike) ?? null;
      }
      const { data, error } = await (supabase as any)
        .from('vcr_plan_snapshots')
        .select('snapshot')
        .eq('handover_point_id', handoverPointId)
        .eq('kind', 'baseline')
        .is('voided_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.snapshot as VcrSnapshotLike) ?? null;
    },
  });

  const from = fromQ.data ?? null;
  const to = toQ.data ?? null;

  const diff = useMemo(() => {
    if (!from || !to) return null;
    return computeVcrPlanDiff(from, to);
  }, [from, to]);

  // Resolve checklist item ids → names
  const allItemIds = useMemo(() => {
    const ids = new Set<string>();
    diff?.checklist.added.forEach((id) => ids.add(id));
    diff?.checklist.removed.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [diff]);

  const namesQ = useQuery({
    queryKey: ['vcr-items-names', allItemIds.sort().join(',')],
    enabled: allItemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_items')
        .select('id, vcr_item')
        .in('id', allItemIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.id] = r.vcr_item; });
      return map;
    },
  });

  return {
    diff,
    from,
    to,
    fromMissing: !fromQ.isLoading && !from,
    toMissing: !toQ.isLoading && !to,
    loading: fromQ.isLoading || toQ.isLoading,
    itemNames: namesQ.data || {},
  };
}
