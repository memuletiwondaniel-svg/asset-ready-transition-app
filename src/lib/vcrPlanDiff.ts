/**
 * Pure diff utility for VCR plan snapshots.
 *
 * `from` / `to` MUST share the same shape as the JSON returned by
 * `_vcr_build_snapshot_payload` / `vcr_plan_live_snapshot` and stored in
 * `vcr_plan_snapshots.snapshot`. See `VCRPlanSnapshot` in wizardModeContext.
 *
 * No fetching, no side effects — keep it deterministic so the component can
 * memoise on referential equality.
 */

import type { VCRPlanSnapshot } from '@/components/widgets/vcr-wizard/wizardModeContext';

export type VcrSnapshotLike = Partial<VCRPlanSnapshot> & Record<string, any>;

export interface SectionDiff {
  added: string[];   // ids
  removed: string[]; // ids
  unchanged: number;
}

export interface RosterMember {
  id: string;
  user_id: string | null;
  role_label: string;
}
export interface RosterDiff {
  added: RosterMember[];
  removed: RosterMember[];
  unchanged: number;
}

export interface VcrPlanDiff {
  checklist: SectionDiff;
  documents: SectionDiff;
  training: SectionDiff;
  procedures: SectionDiff;
  registers: SectionDiff;
  logsheets: SectionDiff;
  maintenance: SectionDiff;
  roster: RosterDiff;
  totalChanged: number;
}

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function diffIdArrays(fromIds: string[], toIds: string[]): SectionDiff {
  const fromSet = new Set(fromIds);
  const toSet = new Set(toIds);
  const added: string[] = [];
  const removed: string[] = [];
  let unchanged = 0;
  toSet.forEach((id) => { if (!fromSet.has(id)) added.push(id); else unchanged++; });
  fromSet.forEach((id) => { if (!toSet.has(id)) removed.push(id); });
  return { added, removed, unchanged };
}

function diffSectionById(from: unknown, to: unknown): SectionDiff {
  const fromIds = asArr<any>(from).map((r) => String(r?.id)).filter(Boolean);
  const toIds = asArr<any>(to).map((r) => String(r?.id)).filter(Boolean);
  return diffIdArrays(fromIds, toIds);
}

function diffRoster(from: unknown, to: unknown): RosterDiff {
  const fromArr = asArr<any>(from);
  const toArr = asArr<any>(to);
  const key = (r: any) => (r?.user_id ? `u:${r.user_id}` : `r:${r?.id}`);
  const fromMap = new Map(fromArr.map((r) => [key(r), r]));
  const toMap = new Map(toArr.map((r) => [key(r), r]));
  const added: RosterMember[] = [];
  const removed: RosterMember[] = [];
  let unchanged = 0;
  toMap.forEach((r, k) => {
    if (!fromMap.has(k)) {
      added.push({ id: r.id, user_id: r.user_id ?? null, role_label: r.role_label ?? '' });
    } else unchanged++;
  });
  fromMap.forEach((r, k) => {
    if (!toMap.has(k)) {
      removed.push({ id: r.id, user_id: r.user_id ?? null, role_label: r.role_label ?? '' });
    }
  });
  return { added, removed, unchanged };
}

export function computeVcrPlanDiff(
  from: VcrSnapshotLike | null | undefined,
  to: VcrSnapshotLike | null | undefined,
): VcrPlanDiff {
  const f = from || {};
  const t = to || {};
  const checklist = diffIdArrays(
    asArr<string>(f.active_vcr_item_ids).map(String),
    asArr<string>(t.active_vcr_item_ids).map(String),
  );
  const documents = diffSectionById(f.documents, t.documents);
  const training = diffSectionById(f.training, t.training);
  const procedures = diffSectionById(f.procedures, t.procedures);
  const registers = diffSectionById(f.registers, t.registers);
  const logsheets = diffSectionById(f.logsheets, t.logsheets);
  const maintenance = diffSectionById(f.maintenance, t.maintenance);
  const roster = diffRoster(f.approvers, t.approvers);

  const totalChanged =
    checklist.added.length + checklist.removed.length +
    documents.added.length + documents.removed.length +
    training.added.length + training.removed.length +
    procedures.added.length + procedures.removed.length +
    registers.added.length + registers.removed.length +
    logsheets.added.length + logsheets.removed.length +
    maintenance.added.length + maintenance.removed.length +
    roster.added.length + roster.removed.length;

  return { checklist, documents, training, procedures, registers, logsheets, maintenance, roster, totalChanged };
}
