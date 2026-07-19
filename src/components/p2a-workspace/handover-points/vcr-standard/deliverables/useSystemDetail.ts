import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subsystem {
  id: string;
  system_id: string;
  subsystem_id: string;
  name: string;
  mcc_achieved: boolean;
  mcc_date: string | null;
  pcc_achieved: boolean;
  pcc_date: string | null;
  completion_percentage: number;
  itr_count: number;
}

export type ItrDiscipline = 'INS' | 'ELE' | 'MEC' | 'PIP' | 'CIV';

export const DISCIPLINE_LABEL: Record<ItrDiscipline, string> = {
  INS: 'Instrumentation',
  ELE: 'Electrical',
  MEC: 'Mechanical',
  PIP: 'Piping',
  CIV: 'Civil',
};

// Single letter used in short display code (e.g. GCC-M39A → M = Mechanical/Piping bucket).
// Daniel's example maps M to mechanical family; keep P separate to preserve punch-family disambiguation.
const DISC_LETTER: Record<ItrDiscipline, string> = {
  INS: 'I',
  ELE: 'E',
  MEC: 'M',
  PIP: 'P',
  CIV: 'C',
};

export interface ITRRow {
  id: string;
  ref: string;
  description: string;
  phase: 'A' | 'B';
  discipline: ItrDiscipline | null;
  tag: string | null;
  status: 'Outstanding' | 'Completed';
  subsystem_id: string;
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
  subsystem_id: string;
  subsystem_code: string;
}

/**
 * Derive a shorter, human-friendly ITR display code from the authoritative ref.
 * ref format: {ORIG}-ITR-{A|B}-{DISC}-{SYS}-{SUB}-{SEQ}
 * output:     {ORIG}-{L}{seq-no-leading-zeros}{PHASE}   e.g. GCC-M39A
 *
 * originatorOverride lets callers force the display prefix (e.g. "GCC").
 * When absent we fall back to the ref's first segment (typically "6529").
 */
export const formatItrDisplayCode = (itr: Pick<ITRRow, 'ref' | 'phase' | 'discipline'>, originatorOverride?: string): string => {
  const parts = (itr.ref || '').split('-');
  const orig = originatorOverride || parts[0] || 'ITR';
  const seqRaw = parts[parts.length - 1] || '';
  const seq = String(parseInt(seqRaw, 10) || 0);
  const letter = itr.discipline ? DISC_LETTER[itr.discipline] : '?';
  return `${orig}-${letter}${seq}${itr.phase}`;
};

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
        subsystem_id: r.subsystem_id,
        subsystem_code: subById.get(r.subsystem_id)?.subsystem_id ?? '',
      }));

      return { subsystems: subs, itrs, punches };
    },
  });
};

export const computeSystemMilestone = (
  completion_status: string | null,
  is_hydrocarbon: boolean,
  subsystems: Subsystem[],
  completion_percentage: number | null = null,
): { label: string; tone: 'emerald' | 'blue' | 'amber' | 'slate' } => {
  const s = (completion_status || '').toUpperCase();
  if (is_hydrocarbon && s === 'RFSU') return { label: 'RFSU', tone: 'emerald' };
  if (!is_hydrocarbon && s === 'RFO') return { label: 'RFO', tone: 'emerald' };
  if (s === 'RFC') return { label: 'RFC', tone: 'blue' };
  if (subsystems.length > 0 && subsystems.every((x) => x.mcc_achieved)) {
    return { label: 'MC', tone: 'blue' };
  }
  const pct = completion_percentage ?? 0;
  if (pct > 0) return { label: 'In progress', tone: 'amber' };
  return { label: 'Not started', tone: 'slate' };
};

// ─── Punch activity log ──────────────────────────────────────────
export interface PunchComment {
  id: string;
  punch_id: string;
  author_user_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

export const usePunchComments = (punchId: string | undefined) => {
  return useQuery({
    enabled: !!punchId,
    queryKey: ['punch-comments', punchId],
    queryFn: async () => {
      const c = supabase as any;
      const { data, error } = await c
        .from('p2a_system_punch_activity_log')
        .select('id, punch_id, author_user_id, body, attachment_url, attachment_name, created_at')
        .eq('punch_id', punchId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as any[];
      const authorIds = Array.from(new Set(rows.map((r) => r.author_user_id).filter(Boolean)));
      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (authorIds.length) {
        const { data: profs } = await c
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds);
        for (const p of profs || []) profiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      }
      return rows.map<PunchComment>((r) => ({
        id: r.id,
        punch_id: r.punch_id,
        author_user_id: r.author_user_id,
        author_name: r.author_user_id ? profiles[r.author_user_id]?.full_name ?? null : null,
        author_avatar_url: r.author_user_id ? profiles[r.author_user_id]?.avatar_url ?? null : null,
        body: r.body,
        attachment_url: r.attachment_url,
        attachment_name: r.attachment_name,
        created_at: r.created_at,
      }));
    },
  });
};

export const useAddPunchComment = (punchId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!punchId) throw new Error('no punch');
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('not signed in');
      const c = supabase as any;
      const { error } = await c
        .from('p2a_system_punch_activity_log')
        .insert({ punch_id: punchId, author_user_id: uid, body });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['punch-comments', punchId] });
    },
  });
};
