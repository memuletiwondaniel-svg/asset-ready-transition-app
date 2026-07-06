import React from 'react';
import { cn } from '@/lib/utils';

export type ChipTone = 'emerald' | 'blue' | 'amber' | 'red' | 'slate';

export interface DeliverableRowProps {
  name: string;
  context?: string | null;
  chipLabel: string;
  chipTone: ChipTone;
  nameBadge?: React.ReactNode;
  onClick?: () => void;
}

const CHIP_TONES: Record<ChipTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-muted-foreground',
};

/**
 * v8_1 shared deliverable row.
 *   name · muted context line · one live chip on right
 * Row is a button when onClick is provided; otherwise a plain <div>.
 */
export const DeliverableRow: React.FC<DeliverableRowProps> = ({
  name, context, chipLabel, chipTone, nameBadge, onClick,
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
        'hover:bg-muted/40',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-snug truncate">{name}</div>
        {context && (
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
            {context}
          </div>
        )}
      </div>
      <span
        className={cn(
          'flex-none text-[10.5px] font-bold rounded-full px-2 py-0.5 mt-0.5',
          CHIP_TONES[chipTone],
        )}
      >
        {chipLabel}
      </span>
    </Tag>
  );
};

export const EmptyDeliverable: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <div className="px-4 py-8 text-center">
    <div className="text-[12.5px] text-muted-foreground">{label}</div>
    {hint && <div className="text-[11px] text-muted-foreground/70 mt-1">{hint}</div>}
  </div>
);

export const DeliverableList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="divide-y divide-border/60 rounded-lg border bg-background overflow-hidden">
    {children}
  </div>
);

export const oraStatusChip = (
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | string | null | undefined,
  pct: number | null | undefined,
): { label: string; tone: ChipTone } => {
  const s = (status || 'NOT_STARTED').toString().toUpperCase();
  if (s === 'COMPLETED') return { label: 'Complete', tone: 'emerald' };
  if (s === 'IN_PROGRESS') return { label: `${Math.round(pct || 0)}%`, tone: 'blue' };
  return { label: 'To deliver', tone: 'slate' };
};
