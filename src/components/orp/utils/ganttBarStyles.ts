/**
 * Shared Gantt bar appearance — single source of truth for both
 * the wizard Step-4 schedule Gantt (StepSchedule.tsx) and the
 * plan-view Gantt (ORPGanttChart.tsx).
 *
 * Bar = visible phase-tinted "track" (always rendered across full
 * duration) + solid phase-color "fill" whose width = completion%.
 *
 * Phase colors avoid amber / emerald / red / rose because those
 * collide with the unified status color system
 * (see src/components/orp/utils/statusStyles.ts):
 *   Completed   → emerald
 *   In Progress → amber
 *   On Hold     → red
 */

export interface GanttBarStyle {
  /** Always-visible full-duration track: phase tint + phase border. */
  track: string;
  /** Solid phase-color fill layered over the track (width = completion%). */
  fill: string;
}

const PHASE_BAR_STYLES: Record<string, GanttBarStyle> = {
  IDN: {
    track: 'bg-blue-500/30 border border-blue-500/60 dark:bg-blue-500/35 dark:border-blue-500/70',
    fill: 'bg-blue-500 dark:bg-blue-400',
  },
  ASS: {
    track: 'bg-sky-500/30 border border-sky-500/60 dark:bg-sky-500/35 dark:border-sky-500/70',
    fill: 'bg-sky-500 dark:bg-sky-400',
  },
  SEL: {
    track: 'bg-cyan-500/30 border border-cyan-500/60 dark:bg-cyan-500/35 dark:border-cyan-500/70',
    fill: 'bg-cyan-500 dark:bg-cyan-400',
  },
  DEF: {
    track: 'bg-teal-500/30 border border-teal-500/60 dark:bg-teal-500/35 dark:border-teal-500/70',
    fill: 'bg-teal-500 dark:bg-teal-400',
  },
  EXE: {
    track: 'bg-indigo-500/30 border border-indigo-500/60 dark:bg-indigo-500/35 dark:border-indigo-500/70',
    fill: 'bg-indigo-500 dark:bg-indigo-400',
  },
  OPR: {
    track: 'bg-purple-500/30 border border-purple-500/60 dark:bg-purple-500/35 dark:border-purple-500/70',
    fill: 'bg-purple-500 dark:bg-purple-400',
  },
  VCR: {
    track: 'bg-violet-500/30 border border-violet-500/60 dark:bg-violet-500/35 dark:border-violet-500/70',
    fill: 'bg-violet-500 dark:bg-violet-400',
  },
};

/** Visible neutral fallback for unknown / custom prefixes (GEN-, etc.) */
const FALLBACK_BAR_STYLE: GanttBarStyle = {
  track: 'bg-slate-500/30 border border-slate-500/60 dark:bg-slate-500/35 dark:border-slate-500/70',
  fill: 'bg-slate-500 dark:bg-slate-400',
};

export function getGanttPhasePrefix(code: string | null | undefined): string {
  if (!code) return '';
  if (code.startsWith('VCR-')) return 'VCR';
  return code.split('-')[0];
}

export function getGanttBarStyle(code: string | null | undefined): GanttBarStyle {
  return PHASE_BAR_STYLES[getGanttPhasePrefix(code)] || FALLBACK_BAR_STYLE;
}

/**
 * Label text styling — used INSIDE a small contrasting "chip" wrapper so
 * the label stays legible on the pale track, on the solid phase-color fill,
 * and during drag-over states. Pair with GANTT_BAR_LABEL_CHIP_CLASS.
 */
export const GANTT_BAR_LABEL_CLASS = 'text-foreground font-semibold';

/**
 * Semi-transparent backdrop chip that wraps the label text so it reads
 * on ANY background (track, fill, row). Use as the wrapping element's
 * className together with GANTT_BAR_LABEL_CLASS on the inner <span>.
 */
export const GANTT_BAR_LABEL_CHIP_CLASS =
  'inline-flex items-center rounded px-1 py-px bg-background/75 backdrop-blur-sm shadow-sm';

/**
 * Standardized in-bar label: show completion% when the activity has
 * meaningful progress, otherwise fall back to duration ("Xd"). Used by
 * both the wizard Step-4 Gantt and the plan-view Gantt so they match.
 */
export function getGanttBarLabel(
  completion: number | null | undefined,
  durationDays: number | null | undefined
): string {
  const c = Number(completion) || 0;
  if (c > 0) return `${Math.round(c)}%`;
  const d = Number(durationDays);
  if (d && d > 0) return `${d}d`;
  return '';
}

/**
 * Single neutral ID badge style used across every surface
 * (Gantt rows, predecessor picker, detail sheets, both files).
 * Monospace, muted slate, consistent shape — no status-colliding hues.
 */
export const ID_BADGE_CLASS =
  'inline-flex items-center rounded px-1.5 py-0.5 font-mono font-semibold whitespace-nowrap bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

/** Back-compat object form for callers that destructure { bg, text }. */
export const ID_BADGE_COLORS = {
  bg: 'bg-slate-100 dark:bg-slate-800',
  text: 'text-slate-700 dark:text-slate-300',
};

