import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Canonical training_status enum (matches Postgres `training_status` type).
 * Single source of truth for label, tone, order, and step-in-lifecycle.
 *
 * Step scale: 0..8 (used by mini progress bars + drawer "Step N of 8" caption).
 */
export type TrainingStatus =
  | 'NOT_STARTED'
  | 'AWAITING_PO'
  | 'AWAITING_MATERIALS'
  | 'MATERIALS_UNDER_REVIEW'
  | 'AWAITING_ATTENDANCE_LIST'
  | 'READY_TO_SCHEDULE'
  | 'SCHEDULED'
  | 'COMPLETED';

export type TrainingChipTone = 'emerald' | 'blue' | 'amber' | 'red' | 'slate';

interface Meta {
  label: string;
  tone: TrainingChipTone;
  step: number; // 0..8
  order: number;
}

export const TRAINING_STATUS_META: Record<TrainingStatus, Meta> = {
  NOT_STARTED:              { label: 'Not started',            tone: 'slate',   step: 0, order: 0 },
  AWAITING_PO:              { label: 'Awaiting PO',            tone: 'amber',   step: 1, order: 1 },
  AWAITING_MATERIALS:       { label: 'Awaiting materials',     tone: 'amber',   step: 2, order: 2 },
  MATERIALS_UNDER_REVIEW:   { label: 'Materials under review', tone: 'blue',    step: 3, order: 3 },
  AWAITING_ATTENDANCE_LIST: { label: 'Awaiting attendance',    tone: 'amber',   step: 4, order: 4 },
  READY_TO_SCHEDULE:        { label: 'Ready to schedule',      tone: 'blue',    step: 5, order: 5 },
  SCHEDULED:                { label: 'Scheduled',              tone: 'blue',    step: 6, order: 6 },
  COMPLETED:                { label: 'Completed',              tone: 'emerald', step: 8, order: 7 },
};

export const TRAINING_TOTAL_STEPS = 8;

export const isTrainingStatus = (v: unknown): v is TrainingStatus =>
  typeof v === 'string' && v in TRAINING_STATUS_META;

export const normalizeTrainingStatus = (v: string | null | undefined): TrainingStatus => {
  if (!v) return 'NOT_STARTED';
  const s = v.toUpperCase();
  return isTrainingStatus(s) ? s : 'NOT_STARTED';
};

export const trainingStatusMeta = (v: string | null | undefined): Meta =>
  TRAINING_STATUS_META[normalizeTrainingStatus(v)];

const TONE_CLASS: Record<TrainingChipTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  blue:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  amber:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  red:     'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
  slate:   'bg-slate-100 text-muted-foreground border-border',
};

interface Props {
  status: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Canonical status pill for training lifecycle. Renders label + tone from
 * TRAINING_STATUS_META, in a border-outline style consistent with other
 * VCR chips. `size='md'` is used by the drawer header pill.
 */
export const TrainingStatusChip: React.FC<Props> = ({ status, size = 'sm', className }) => {
  const meta = trainingStatusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        size === 'md' ? 'text-[11px] px-2.5 py-0.5' : 'text-[10.5px] px-2 py-0.5',
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
};
