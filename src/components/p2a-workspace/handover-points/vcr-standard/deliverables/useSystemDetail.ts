import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subsystem {
  id: string;
  system_id: string; // uuid FK
  subsystem_id: string; // text code
  name: string;
  mcc_achieved: boolean;
  mcc_date: string | null;
  pcc_achieved: boolean;
  pcc_date: string | null;
  completion_percentage: number;
  itr_count: number;
}

export interface ITRRow {
  id: string;
  ref: string;
  description: string;
  phase: 'A' | 'B';
  discipline: string;
  tag: string | null;
  status: 'Outstanding' | 'Completed';
  subsystem_id: string; // uuid FK
  subsystem_code: string;
}

export interface PunchRow {
  id: string;
  ref: string;
  category: 'A' | 'B';
  description: string;
  status: 'Open' | 'Closed';
  raised_by_name: string | null;
  raised_at: string | null;
  cleared_by_name: string | null;
  cleared_at: string | null;
  closure_note: string | null;
  linked_itr_ref: string | null;
  subsystem_code: string;
}

export const useSystemDetail = (systemUuid: string | undefined) => {
  return useQuery({
    enabled: !!systemUuid,
    queryKey: ['system-detail', systemUuid],
    queryFn: async () => {
      const c = supabase as any;
      const [subsRes, itrsRes, punchRes] = await Promise.all([
        c.from('p2a_subsystems').select('*').eq('system_id', systemUuid).order('subsystem_id'),
        c.from('p2a_system_itrs').select('*').eq('system_id', systemUuid).order('ref'),
        c.from('p2a_system_punch_items').select('*').eq('system_id', systemUuid).order('ref'),
      ]);

      const subs: Subsystem[] = (subsRes.data || []).map((r: any) => ({
        id: r.id,
        system_id: r.system_id,
        subsystem_id: r.subsystem_id,
        name: r.name,
        mcc_achieved: !!r.mcc_achieved,
        mcc_date: r.mcc_date,
        pcc_achieved: !!r.pcc_achieved,
        pcc_date: r.pcc_date,
        completion_percentage: r.completion_percentage ?? 0,
        itr_count: r.itr_count ?? 0,
      }));

      const subById = new Map(subs.map((s) => [s.id, s]));
      const itrs: ITRRow[] = (itrsRes.data || []).map((r: any) => ({
        id: r.id,
        ref: r.ref,
        description: r.description,
        phase: r.phase,
        discipline: r.discipline,
        tag: r.tag,
        status: r.status,
        subsystem_id: r.subsystem_id,
        subsystem_code: subById.get(r.subsystem_id)?.subsystem_id ?? '',
      }));

      const punches: PunchRow[] = (punchRes.data || []).map((r: any) => ({
        id: r.id,
        ref: r.ref,
        category: r.category,
        description: r.description,
        status: r.status,
        raised_by_name: null,
        raised_at: r.raised_at,
        cleared_by_name: null,
        cleared_at: r.cleared_at,
        closure_note: r.closure_note,
        linked_itr_ref: r.linked_itr_ref,
        subsystem_code: subById.get(r.subsystem_id)?.subsystem_id ?? '',
      }));

      return { subsystems: subs, itrs, punches };
    },
  });
};

/**
 * Per S1: system milestone = highest achieved of MC / RFC / RFO (non-HC) / RFSU (HC).
 * MC requires ALL subsystems to have mcc_achieved.
 */
export const computeSystemMilestone = (
  completion_status: string | null,
  is_hydrocarbon: boolean,
  subsystems: Subsystem[],
): { label: string; tone: 'emerald' | 'blue' | 'slate' } => {
  const s = (completion_status || '').toUpperCase();
  if (is_hydrocarbon && s === 'RFSU') return { label: 'RFSU', tone: 'emerald' };
  if (!is_hydrocarbon && s === 'RFO') return { label: 'RFO', tone: 'emerald' };
  if (s === 'RFC') return { label: 'RFC', tone: 'blue' };
  if (subsystems.length > 0 && subsystems.every((x) => x.mcc_achieved)) {
    return { label: 'MC', tone: 'blue' };
  }
  return { label: 'Not started', tone: 'slate' };
};
