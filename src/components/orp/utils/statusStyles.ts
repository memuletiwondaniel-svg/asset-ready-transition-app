/**
 * Unified status color system used across Gantt bars, Kanban cards,
 * overlay toggles, and badge pills. Single source of truth.
 *
 * Palette:
 *   NOT_STARTED → slate
 *   IN_PROGRESS → amber
 *   COMPLETED   → emerald
 *   ON_HOLD     → red
 */

export type ActivityStatusKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export const STATUS_COLORS = {
  NOT_STARTED: {
    badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
    toggleActive: 'bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200',
    kanbanPill: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
    accent: 'border-l-slate-400',
  },
  IN_PROGRESS: {
    badge: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    toggleActive: 'bg-amber-500 text-white shadow-sm dark:bg-amber-600',
    kanbanPill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    accent: 'border-l-amber-500',
  },
  COMPLETED: {
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    toggleActive: 'bg-emerald-500 text-white shadow-sm dark:bg-emerald-600',
    kanbanPill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    accent: 'border-l-emerald-500',
  },
  ON_HOLD: {
    badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    toggleActive: 'bg-red-500 text-white shadow-sm dark:bg-red-600',
    kanbanPill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    accent: 'border-l-red-500',
  },
} as const;

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'NOT_STARTED': 'Not Started',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'ON_HOLD': 'On Hold',
  };
  return labels[status] || status.replace('_', ' ');
};

export const getStatusBadgeClasses = (status: string): string => {
  return STATUS_COLORS[status as ActivityStatusKey]?.badge || '';
};

/** Get toggle button active class for status (used in ORA overlay) */
export const getStatusToggleClasses = (status: string): string => {
  return STATUS_COLORS[status as ActivityStatusKey]?.toggleActive || '';
};

/** Get kanban pill classes for status */
export const getStatusKanbanPillClasses = (status: string): string => {
  return STATUS_COLORS[status as ActivityStatusKey]?.kanbanPill || '';
};
