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
const SUPABASE_URL = 'https://kgnrjqjbonuvpxxfvfjq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbnJqcWpib251dnB4eGZ2ZmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODgwMjgsImV4cCI6MjA2ODY2NDAyOH0.tj1l_8eFDnHvAJKxEEHjQMid8l9vGG0mNIFlK6b6HKM';

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
      .abortSignal(controller.signal)
      .maybeSingle();

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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), COMPUTE_TIMEOUT_MS);
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/compute-vcr-insights`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ vcr_id: vcrId, vcr_item_id: vcrItemId, force }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Readiness check failed');
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Readiness check timed out');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
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
