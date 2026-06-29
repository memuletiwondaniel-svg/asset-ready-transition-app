import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VCRInsights } from '@/components/widgets/VCRItemDetailSheet';

/**
 * AI-1 Readiness Insights hook — cache-then-compute, with a hard timeout
 * so a hung cache read can never leave the UI stuck on "pending".
 *
 * Engine is advisory only — it never mutates prereqs, approvers, or submit paths.
 */
const CACHE_READ_TIMEOUT_MS = 3_000;
const COMPUTE_TIMEOUT_MS = 15_000;
const TIMEOUT = Symbol('timeout');

function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    Promise.resolve(p).then(
      (v) => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(v);
        }
      },
      () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(fallback);
        }
      },
    );
  });
}

type CacheReadResult =
  | { status: 'hit'; payload: VCRInsights }
  | { status: 'miss' }
  | { status: 'timeout' }
  | { status: 'error' };

async function readCachedInsights(vcrId: string, vcrItemId: string): Promise<CacheReadResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CACHE_READ_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from('vcr_item_insights')
      .select('payload')
      .eq('vcr_id', vcrId)
      .eq('vcr_item_id', vcrItemId)
      .maybeSingle()
      .abortSignal(controller.signal);

    if (timedOut) return { status: 'timeout' };
    if (error) return { status: 'error' };
    if (!data) return { status: 'miss' };
    return { status: 'hit', payload: (data.payload as unknown as VCRInsights) ?? { state: 'unavailable' } };
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (timedOut || name === 'AbortError') return { status: 'timeout' };
    return { status: 'error' };
  } finally {
    window.clearTimeout(timer);
  }
}

async function invokeComputeOnce(vcrId: string, vcrItemId: string, force = false) {
  const result = await withTimeout(
    supabase.functions.invoke('compute-vcr-insights', {
      body: { vcr_id: vcrId, vcr_item_id: vcrItemId, force },
    }),
    COMPUTE_TIMEOUT_MS,
    TIMEOUT,
  );

  if (result === TIMEOUT) throw new Error('Readiness check timed out');
  const { data, error } = result as Awaited<ReturnType<typeof supabase.functions.invoke>>;
  if (error) throw error;
  return data;
}

export function useVCRItemInsights(vcrId: string | undefined, vcrItemId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['vcr-item-insights', vcrId, vcrItemId];
  const computeAttemptsRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<VCRInsights> => {
      if (!vcrId || !vcrItemId) return { state: 'unavailable' };

      const cacheRead = await readCachedInsights(vcrId, vcrItemId);

      if (cacheRead.status === 'hit') return cacheRead.payload;

      if (cacheRead.status === 'timeout' || cacheRead.status === 'error') {
        // A stalled/erroring cache read is not a cache miss. Do not kick compute,
        // or repeated item opens can pile up background invocations and worsen pool pressure.
        return { state: 'unavailable' };
      }

      const attemptKey = `${vcrId}:${vcrItemId}`;
      if (!computeAttemptsRef.current.has(attemptKey)) {
        computeAttemptsRef.current.add(attemptKey);
        invokeComputeOnce(vcrId, vcrItemId)
          .then(() => qc.invalidateQueries({ queryKey }))
          .catch(() => qc.setQueryData(queryKey, { state: 'unavailable' } satisfies VCRInsights));
        return { state: 'pending' };
      }

      return { state: 'unavailable' };
    },
    enabled: !!vcrId && !!vcrItemId,
    staleTime: 60_000,
  });

  const recompute = useMutation({
    mutationFn: async () => {
      if (!vcrId || !vcrItemId) return null;
      return invokeComputeOnce(vcrId, vcrItemId, true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { insights: query.data, isLoading: query.isLoading, recompute };
}
