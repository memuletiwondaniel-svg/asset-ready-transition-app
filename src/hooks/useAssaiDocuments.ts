// =========================================================================
// MOCK IMPLEMENTATION — Simulates a live Assai DMS query using local data
// from public.dms_document_types. Replace this hook's body with a call to
// the real `search-assai-documents` edge function once it exists.
// Build target: Phase 2 — Live Assai Integration.
//
// The hook signature, return shape, loading/error semantics, and 600-900ms
// latency MUST be preserved so consumers (CheckAssaiModal) do not change.
// =========================================================================

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AssaiTierFilter = 'all' | 'Tier 1' | 'Tier 2' | 'RLMU';
export type AssaiStatusFilter = 'all' | 'Issued' | 'For Review' | 'Superseded';

export interface AssaiDocument {
  // Underlying dms_document_types row id — used to bind back to a
  // vcr_document_requirements.document_type_id when the user clicks "Add to VCR".
  document_type_id: string;
  document_number: string; // synthesized 9-segment doc number
  title: string;
  tier: string | null;
  discipline_code: string | null;
  discipline_name: string | null;
  status: 'Issued' | 'For Review' | 'Superseded';
  revision: string;
  last_modified: string; // ISO date
  originator: string;
  // Carry-through for denormalized inserts on bind
  document_scope: string | null;
  package_tag: string | null;
  is_mdr: boolean | null;
  code: string | null;
}

export interface AssaiFilters {
  tier: AssaiTierFilter;
  disciplines: string[]; // discipline_code values
  originators: string[];
  status: AssaiStatusFilter;
  search: string;
}

export interface AssaiContext {
  projectCode?: string | null;
  plantCode?: string | null;
}

interface UseAssaiDocumentsResult {
  data: AssaiDocument[];
  total: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  // Distinct facets present in the *current* fetched result set (for chip popups).
  facets: {
    disciplines: { code: string; name: string }[];
    originators: string[];
  };
}

const ORIGINATORS = ['BGC', 'WGEL', 'Wood', 'Aker', 'Worley', 'Petrofac'];
const REVISIONS = ['A', 'B', 'C', '0', '1'];
const STATUSES: AssaiDocument['status'][] = ['Issued', 'For Review', 'Superseded'];

// Deterministic small hash from a uuid → non-negative integer.
function hash(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// MOCK: build a 9-segment Assai-style doc number from project context + a
// deterministic per-row sequence. Real integration will read this from Assai.
function synthDocNumber(
  row: any,
  ctx: AssaiContext,
  idx: number,
): string {
  const project = ctx.projectCode || 'TBD';
  const originator = ORIGINATORS[hash(row.id) % ORIGINATORS.length];
  const plant = ctx.plantCode || 'TBD';
  const site = 'TBD';
  const unit = 'TBD';
  const disc = row.discipline_code || 'XX';
  const type = (row.code || '0000').toString().padStart(4, '0').slice(0, 4);
  const seq = (hash(row.id) % 99999).toString().padStart(5, '0');
  const suffix = '001';
  return `${project}-${originator}-${plant}-${site}-${unit}-${disc}-${type}-${seq}-${suffix}`;
}

function synthMeta(row: any): Omit<AssaiDocument, 'document_number' | 'document_type_id' | 'title' | 'tier' | 'discipline_code' | 'discipline_name' | 'document_scope' | 'package_tag' | 'is_mdr' | 'code'> {
  const h = hash(row.id);
  const daysAgo = h % 90;
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    status: STATUSES[h % STATUSES.length],
    revision: REVISIONS[h % REVISIONS.length],
    last_modified: d.toISOString().slice(0, 10),
    originator: ORIGINATORS[h % ORIGINATORS.length],
  };
}

export function useAssaiDocuments(
  filters: AssaiFilters,
  ctx: AssaiContext,
  page: number,
  perPage: number = 50,
): UseAssaiDocumentsResult {
  const [data, setData] = useState<AssaiDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const firstLoad = useRef(true);
  const [facets, setFacets] = useState<UseAssaiDocumentsResult['facets']>({
    disciplines: [],
    originators: [],
  });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (firstLoad.current) setIsLoading(true);
      setIsFetching(true);
      setIsError(false);
      setErrorMessage(null);

      // MOCK: simulating Assai live fetch using local dms_document_types catalog.
      // Replace with search-assai-documents edge function when ready.
      const simulatedLatency = 600 + Math.floor(Math.random() * 300);

      try {
        let q: any = (supabase as any)
          .from('dms_document_types')
          .select('id, code, document_name, tier, discipline_code, discipline_name, document_scope, package_tag, is_mdr', { count: 'exact' })
          .eq('is_active', true);

        // Tier filter — note: RLMU lives in its own column on dms_document_types.
        if (filters.tier === 'RLMU') q = q.eq('rlmu', 'RLMU');
        else if (filters.tier !== 'all') q = q.eq('tier', filters.tier);

        if (filters.disciplines.length > 0) q = q.in('discipline_code', filters.disciplines);

        if (filters.search.trim()) {
          const s = filters.search.trim().replace(/[%_]/g, '');
          q = q.or(`document_name.ilike.%${s}%,code.ilike.%${s}%`);
        }

        // Server-side pagination
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;
        q = q.order('display_order', { ascending: true }).range(from, to);

        const [{ data: rows, error, count }] = await Promise.all([
          q,
          new Promise<void>((res) => setTimeout(res, simulatedLatency)) as any,
        ]).then((arr: any[]) => [arr[0]]);

        if (cancelled) return;
        if (error) throw error;

        // Apply synthesized metadata
        const synthesized: AssaiDocument[] = (rows || []).map((r: any, i: number) => {
          const meta = synthMeta(r);
          return {
            document_type_id: r.id,
            document_number: synthDocNumber(r, ctx, i),
            title: r.document_name,
            tier: r.tier ?? null,
            discipline_code: r.discipline_code ?? null,
            discipline_name: r.discipline_name ?? null,
            ...meta,
            document_scope: r.document_scope ?? null,
            package_tag: r.package_tag ?? null,
            is_mdr: r.is_mdr ?? null,
            code: r.code ?? null,
          };
        });

        // Originator/Status post-filters (synthesized values, applied client-side).
        let final = synthesized;
        if (filters.originators.length > 0) {
          final = final.filter((d) => filters.originators.includes(d.originator));
        }
        if (filters.status !== 'all') {
          final = final.filter((d) => d.status === filters.status);
        }

        // Build facets from the current (pre-post-filter) page for chip popups.
        const discMap = new Map<string, string>();
        const originatorSet = new Set<string>();
        synthesized.forEach((d) => {
          if (d.discipline_code) discMap.set(d.discipline_code, d.discipline_name || d.discipline_code);
          originatorSet.add(d.originator);
        });

        setData(final);
        setTotal(count || 0);
        setFacets({
          disciplines: Array.from(discMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
          originators: Array.from(originatorSet).sort(),
        });
      } catch (e: any) {
        if (cancelled) return;
        setIsError(true);
        setErrorMessage(e?.message || 'Failed to fetch Assai documents');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsFetching(false);
          firstLoad.current = false;
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.tier,
    filters.disciplines.join(','),
    filters.originators.join(','),
    filters.status,
    filters.search,
    page,
    perPage,
    ctx.projectCode,
    ctx.plantCode,
    refetchKey,
  ]);

  return {
    data,
    total,
    page,
    perPage,
    isLoading,
    isFetching,
    isError,
    errorMessage,
    refetch: () => {
      firstLoad.current = true;
      setRefetchKey((k) => k + 1);
    },
    facets,
  };
}
