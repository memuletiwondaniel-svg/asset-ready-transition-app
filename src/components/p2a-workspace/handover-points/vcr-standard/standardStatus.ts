/**
 * Shared item-status mapping for the standardized VCR view.
 * Maps p2a_vcr_prerequisites.status → 5-way pill label + tone bucket.
 *
 *   TERMINAL  = ACCEPTED | QUALIFICATION_APPROVED          → green
 *   PIPELINE  = READY_FOR_REVIEW | IN_PROGRESS             → blue
 *   REWORK    = REJECTED                                   → red
 *   QUAL      = QUALIFICATION_REQUESTED                    → amber
 *   TODO      = NOT_STARTED                                → muted
 */
export type PrereqStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'QUALIFICATION_REQUESTED'
  | 'QUALIFICATION_APPROVED';

export type StandardBucket = 'terminal' | 'pipeline' | 'rework' | 'qualification' | 'todeliver';

export interface StandardPill {
  bucket: StandardBucket;
  label: string;
  className: string;
}

export const standardPill = (status: PrereqStatus): StandardPill => {
  switch (status) {
    case 'ACCEPTED':
      return { bucket: 'terminal', label: 'Accepted', className: 'bg-emerald-50 text-emerald-700' };
    case 'QUALIFICATION_APPROVED':
      return { bucket: 'terminal', label: 'Qualified', className: 'bg-emerald-50 text-emerald-700' };
    case 'READY_FOR_REVIEW':
      return { bucket: 'pipeline', label: 'In review', className: 'bg-blue-50 text-blue-700' };
    case 'IN_PROGRESS':
      return { bucket: 'pipeline', label: 'In progress', className: 'bg-blue-50 text-blue-700' };
    case 'REJECTED':
      return { bucket: 'rework', label: 'Rework', className: 'bg-red-50 text-red-700' };
    case 'QUALIFICATION_REQUESTED':
      return { bucket: 'qualification', label: 'Qualification', className: 'bg-amber-50 text-amber-700' };
    case 'NOT_STARTED':
    default:
      return { bucket: 'todeliver', label: 'To deliver', className: 'bg-slate-100 text-muted-foreground' };
  }
};

/** Normalize the free-text `category` column onto the 5-way VCR taxonomy. */
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
