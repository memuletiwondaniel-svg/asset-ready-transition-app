import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Canonical status chip for p2a_vcr_operational_registers.workflow_status.
 * Enum: NOT_STARTED · DRAFT · UNDER_REVIEW · REWORK_REQUESTED · APPROVED.
 * Spec chips:
 *   NOT_STARTED / DRAFT → grey outline
 *   UNDER_REVIEW        → amber filled
 *   REWORK_REQUESTED    → red filled
 *   APPROVED            → green filled
 */

export type RegisterStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'REWORK_REQUESTED'
  | 'APPROVED';

export const REGISTER_STATUS_ORDER: RegisterStatus[] = [
  'NOT_STARTED',
  'DRAFT',
  'REWORK_REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
];

export interface RegisterStatusMeta {
  label: string;
  tone: 'emerald' | 'blue' | 'amber' | 'red' | 'slate';
  step: number;
  isFinal: boolean;
  variant: 'outline' | 'filled';
}

export const REGISTER_TOTAL_STEPS = 4;

export function registerStatusMeta(status: string | null | undefined): RegisterStatusMeta {
  const s = (status || 'NOT_STARTED').toString().toUpperCase();
  switch (s) {
    case 'APPROVED':
      return { label: 'Approved', tone: 'emerald', step: 4, isFinal: true, variant: 'filled' };
    case 'UNDER_REVIEW':
      return { label: 'Under review', tone: 'amber', step: 3, isFinal: false, variant: 'filled' };
    case 'REWORK_REQUESTED':
      return { label: 'Rework', tone: 'red', step: 2, isFinal: false, variant: 'filled' };
    case 'DRAFT':
      return { label: 'Draft', tone: 'slate', step: 2, isFinal: false, variant: 'outline' };
    case 'NOT_STARTED':
    default:
      return { label: 'Not started', tone: 'slate', step: 1, isFinal: false, variant: 'outline' };
  }
}

const FILLED: Record<RegisterStatusMeta['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-muted-foreground border-slate-200',
};
const OUTLINE: Record<RegisterStatusMeta['tone'], string> = {
  emerald: 'bg-transparent text-emerald-700 border-emerald-300',
  blue: 'bg-transparent text-blue-700 border-blue-300',
  amber: 'bg-transparent text-amber-700 border-amber-300',
  red: 'bg-transparent text-red-700 border-red-300',
  slate: 'bg-transparent text-muted-foreground border-border',
};

export const RegisterStatusChip: React.FC<{
  status: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ status, size = 'sm', className }) => {
  const meta = registerStatusMeta(status);
  const cls = meta.variant === 'outline' ? OUTLINE[meta.tone] : FILLED[meta.tone];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold',
        size === 'md' ? 'text-[11px] px-2.5 py-0.5' : 'text-[10.5px] px-2 py-0.5',
        cls,
        className,
      )}
    >
      {meta.label}
    </span>
  );
};
