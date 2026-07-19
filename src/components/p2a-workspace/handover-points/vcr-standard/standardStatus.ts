/**
 * UNIVERSAL STATUS COLOUR LANGUAGE
 *
 *   GREY   = To deliver / Draft (not started)
 *   AMBER  = Under review (being reviewed)
 *   GREEN  = Approved / Completed
 *   RED    = Rework required (rejected)
 *
 * The same four colours are used for the ITEM status badge AND for the
 * QUALIFICATION overlay badge. Users learn the key once and it applies
 * everywhere in the VCR items list.
 */

// ---- Item status --------------------------------------------------------

export type PrereqStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'QUALIFICATION_REQUESTED'
  | 'QUALIFICATION_APPROVED';

export type StandardBucket =
  | 'todeliver'      // grey
  | 'pipeline'       // amber (under review)
  | 'terminal'       // green (approved)
  | 'rework'         // red (rejected)
  | 'qualification'; // handled by overlay; keeps filter chip compatibility

export interface StandardPill {
  bucket: StandardBucket;
  label: string;
  className: string;
}

/**
 * Enum → display mapping for the item status badge (universal colours).
 * Canonical label set — identical in approver and delivering-party contexts.
 *   NOT_STARTED             = "Not started"             (grey)
 *   IN_PROGRESS             = "In progress"             (amber)
 *   READY_FOR_REVIEW        = "Under review"            (amber)
 *   REJECTED                = "Rework requested"        (red)
 *   QUALIFICATION_REQUESTED = "Qualification requested" (amber)
 *   ACCEPTED                = "Approved"                (green)
 *   QUALIFICATION_APPROVED  = "Qualified"               (green)
 */
export const standardPill = (status: PrereqStatus): StandardPill => {
  switch (status) {
    case 'ACCEPTED':
      return { bucket: 'terminal', label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'QUALIFICATION_APPROVED':
      return { bucket: 'terminal', label: 'Qualified', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'READY_FOR_REVIEW':
      return { bucket: 'pipeline', label: 'Under review', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case 'IN_PROGRESS':
      return { bucket: 'pipeline', label: 'In progress', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case 'REJECTED':
      return { bucket: 'rework', label: 'Rework requested', className: 'bg-red-50 text-red-700 border border-red-200' };
    case 'QUALIFICATION_REQUESTED':
      return { bucket: 'qualification', label: 'Qualification requested', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case 'NOT_STARTED':
    default:
      return { bucket: 'todeliver', label: 'Not started', className: 'bg-slate-100 text-slate-600 border border-slate-200' };
  }
};

// ---- Qualification overlay ---------------------------------------------

export type QualStage = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface QualPill {
  stage: QualStage;
  /** Universal colour bucket, shared with items. */
  bucket: 'todeliver' | 'pipeline' | 'terminal' | 'rework';
  /** Label is ALWAYS "Qualification" — colour carries the stage. */
  label: 'Qualification';
  className: string;
  /** For tooltips / aria labels. */
  stageLabel: string;
}

export const qualificationPill = (stage: QualStage): QualPill => {
  switch (stage) {
    case 'APPROVED':
      return { stage, bucket: 'terminal', label: 'Qualification', stageLabel: 'Approved',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'REJECTED':
      return { stage, bucket: 'rework', label: 'Qualification', stageLabel: 'Rejected — rework required',
        className: 'bg-red-50 text-red-700 border border-red-200' };
    case 'PENDING':
      return { stage, bucket: 'pipeline', label: 'Qualification', stageLabel: 'Under review',
        className: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case 'DRAFT':
    default:
      return { stage, bucket: 'todeliver', label: 'Qualification', stageLabel: 'Draft',
        className: 'bg-slate-100 text-slate-600 border border-slate-200' };
  }
};

// ---- Category helpers (unchanged) --------------------------------------

export const normalizeCategoryCode = (raw: string | null | undefined): 'DI' | 'TI' | 'OI' | 'MS' | 'HS' | 'XX' => {
  const s = (raw || '').toLowerCase();
  if (/design/.test(s) || s === 'di') return 'DI';
  if (/technical/.test(s) || s === 'ti') return 'TI';
  if (/operating|operational/.test(s) || s === 'oi') return 'OI';
  if (/management|ms/.test(s)) return 'MS';
  if (/health|safety|hs/.test(s)) return 'HS';
  return 'XX';
};

export const CATEGORY_META: Record<'DI'|'TI'|'OI'|'MS'|'HS', { name: string; short: string }> = {
  DI: { name: 'Design Integrity', short: 'DESIGN INTEGRITY' },
  TI: { name: 'Technical Integrity', short: 'TECHNICAL INTEGRITY' },
  OI: { name: 'Operating Integrity', short: 'OPERATING INTEGRITY' },
  MS: { name: 'Management Systems', short: 'MANAGEMENT SYSTEMS' },
  HS: { name: 'Health & Safety', short: 'HEALTH & SAFETY' },
};

export interface StandardCounts {
  total: number;
  terminal: number;
  pipeline: number;
  rework: number;
  qualification: number;
  todeliver: number;
}

export const emptyCounts = (): StandardCounts => ({
  total: 0, terminal: 0, pipeline: 0, rework: 0, qualification: 0, todeliver: 0,
});

export const rollup = (statuses: PrereqStatus[]): StandardCounts => {
  const c = emptyCounts();
  for (const s of statuses) {
    c.total += 1;
    c[standardPill(s).bucket] += 1;
  }
  return c;
};
