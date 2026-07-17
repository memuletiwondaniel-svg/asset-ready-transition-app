import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Canonical status chip for p2a_vcr_procedures.status.
 * Enum: NOT_STARTED · DRAFT · UNDER_REVIEW · REWORK_REQUESTED · APPROVED.
 */

export type ProcedureStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'REWORK_REQUESTED'
  | 'APPROVED';

export const PROCEDURE_STATUS_ORDER: ProcedureStatus[] = [
  'NOT_STARTED',
  'DRAFT',
  'REWORK_REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
];

export interface ProcedureStatusMeta {
  label: string;
  tone: 'emerald' | 'blue' | 'amber' | 'red' | 'slate';
  step: number;
}

export const PROCEDURE_TOTAL_STEPS = 4;

export function procedureStatusMeta(status: string | null | undefined): ProcedureStatusMeta {
  const s = (status || 'NOT_STARTED').toString().toUpperCase();
  switch (s) {
    case 'APPROVED':
      return { label: 'Approved', tone: 'emerald', step: 4 };
    case 'UNDER_REVIEW':
      return { label: 'Under review', tone: 'blue', step: 3 };
    case 'REWORK_REQUESTED':
      return { label: 'Rework requested', tone: 'red', step: 2 };
    case 'DRAFT':
      return { label: 'Draft', tone: 'amber', step: 2 };
    case 'NOT_STARTED':
    default:
      return { label: 'To deliver', tone: 'slate', step: 1 };
  }
}

const TONE_CLASSES: Record<ProcedureStatusMeta['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-muted-foreground border-slate-200',
};

export const ProcedureStatusChip: React.FC<{
  status: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ status, size = 'sm', className }) => {
  const meta = procedureStatusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold',
        size === 'md' ? 'text-[11px] px-2.5 py-0.5' : 'text-[10.5px] px-2 py-0.5',
        TONE_CLASSES[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
};
