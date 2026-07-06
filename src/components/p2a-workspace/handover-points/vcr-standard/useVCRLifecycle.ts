import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { StandardCounts } from './standardStatus';

/**
 * D3 forward-looking phase chip — single source of truth for the header chip,
 * accent-bar colour (D1) and Parties default expansion (D7).
 *
 * Derived purely from existing fields on p2a_handover_points +
 * vcr_discipline_assurance + item rollup. No schema change.
 */
export type LifecyclePhase =
  | 'DRAFT'              // slate — plan draft / in approval
  | 'IN_EXECUTION'       // blue — items still being accepted
  | 'AWAITING_SUMMARY'   // blue — all items closed, interdisc summary pending
  | 'AWAITING_SOF'       // amber — HC only, sof not signed
  | 'AWAITING_PAC'       // amber — pac not signed
  | 'HANDOVER_COMPLETE'; // green

export interface Lifecycle {
  phase: LifecyclePhase;
  label: string;         // chip text (coarse phase)
  subline: string;       // nuance
  tone: 'slate' | 'blue' | 'amber' | 'emerald';
  chipClass: string;
  barClass: string;
}

const TONES = {
  slate:   { chipClass: 'bg-slate-100 text-slate-700 border-slate-200',       barClass: 'bg-slate-400' },
  blue:    { chipClass: 'bg-blue-50 text-blue-700 border-blue-200',           barClass: 'bg-blue-500' },
  amber:   { chipClass: 'bg-amber-50 text-amber-800 border-amber-200',        barClass: 'bg-amber-500' },
  emerald: { chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',  barClass: 'bg-emerald-500' },
} as const;

const fmt = (iso?: string | null) => (iso ? format(new Date(iso), 'dd MMM yyyy') : '');

export interface LifecycleInputs {
  counts: StandardCounts;
  isHC: boolean;
  execution_plan_status?: string;
  sof_signed_at?: string | null;
  pac_signed_at?: string | null;
  interdisciplinarySignedAt?: string | null;
  disciplineStatementsIn: number;
  disciplineStatementsExpected: number;
}

export function computeLifecycle(i: LifecycleInputs): Lifecycle {
  const { counts, isHC, execution_plan_status, sof_signed_at, pac_signed_at,
          interdisciplinarySignedAt, disciplineStatementsIn, disciplineStatementsExpected } = i;

  // Handover complete
  if (pac_signed_at) {
    return {
      phase: 'HANDOVER_COMPLETE',
      label: 'Handover complete',
      subline: `PAC signed · ${fmt(pac_signed_at)}`,
      tone: 'emerald', ...TONES.emerald,
    };
  }

  // Interdisc summary signed → awaiting a gate
  if (interdisciplinarySignedAt) {
    if (isHC && !sof_signed_at) {
      return {
        phase: 'AWAITING_SOF',
        label: 'Awaiting SoF approval',
        subline: `VCR complete · ${fmt(interdisciplinarySignedAt)}`,
        tone: 'amber', ...TONES.amber,
      };
    }
    // Awaiting PAC (either HC with SoF signed, or non-HC skipping SoF)
    const sub = isHC && sof_signed_at
      ? `SoF approved · ${fmt(sof_signed_at)}`
      : `VCR complete · ${fmt(interdisciplinarySignedAt)}`;
    return {
      phase: 'AWAITING_PAC',
      label: 'Awaiting PAC approval',
      subline: sub,
      tone: 'amber', ...TONES.amber,
    };
  }

  // Plan not yet approved → draft
  if (execution_plan_status && execution_plan_status !== 'APPROVED') {
    return {
      phase: 'DRAFT',
      label: execution_plan_status === 'SUBMITTED' ? 'Plan in approval' : 'Plan draft',
      subline: 'Execution plan not yet approved',
      tone: 'slate', ...TONES.slate,
    };
  }

  // Executing
  const allItemsClosed = counts.total > 0 && counts.terminal === counts.total;
  if (allItemsClosed) {
    return {
      phase: 'AWAITING_SUMMARY',
      label: 'In execution',
      subline: `all items closed · ${disciplineStatementsIn} of ${disciplineStatementsExpected || '?'} discipline statements in`,
      tone: 'blue', ...TONES.blue,
    };
  }
  return {
    phase: 'IN_EXECUTION',
    label: 'In execution',
    subline: `${counts.terminal} of ${counts.total} items closed`,
    tone: 'blue', ...TONES.blue,
  };
}

/**
 * Small fetch: interdisciplinary statement + discipline statement counts +
 * distinct delivering-party count. Kept lightweight so the header can render
 * without pulling the full assurance tab hook.
 */
export function useVCRLifecycleSignals(handoverPointId: string | undefined) {
  return useQuery({
    queryKey: ['vcr-lifecycle-signals', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async () => {
      const client = supabase as any;
      const [statementsRes, prereqsRes] = await Promise.all([
        client.from('vcr_discipline_assurance')
          .select('statement_type,submitted_at,discipline_role_id,discipline_role_name')
          .eq('handover_point_id', handoverPointId),
        client.from('p2a_vcr_prerequisites')
          .select('delivering_party_id,delivering_party_name')
          .eq('handover_point_id', handoverPointId)
          .not('delivering_party_id', 'is', null),
      ]);
      const statements = statementsRes.data || [];
      const prereqs = prereqsRes.data || [];
      const interdisc = statements.find((s: any) => s.statement_type === 'interdisciplinary');
      const disciplineStatementsIn = statements.filter((s: any) => s.statement_type === 'discipline').length;
      const disciplineStatementsExpected = new Set(prereqs.map((p: any) => p.delivering_party_id)).size;
      return {
        interdisciplinarySignedAt: interdisc?.submitted_at || null,
        disciplineStatementsIn,
        disciplineStatementsExpected,
      };
    },
    staleTime: 15_000,
  });
}
