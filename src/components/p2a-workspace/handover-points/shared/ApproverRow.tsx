import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical stacked approver / reviewer row — no separators, one row per
 * person, decision pill pinned right. Used by Procedures, Training and the
 * W&H "Witnessed & accepted by" section so all three surfaces render the
 * same visual pattern.
 */

export type ApproverDecisionTone = 'emerald' | 'red' | 'amber' | 'blue' | 'slate';

export interface ApproverRowChip {
  label: string;
  tone: ApproverDecisionTone;
}

interface Props {
  fullName: string | null;
  roleLabel?: string | null;
  avatarUrl?: string | null;
  chip?: ApproverRowChip | null;
  /** When true the chip slot renders even if chip is null, reserving space. */
  reserveChip?: boolean;
}

const TONES: Record<ApproverDecisionTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-muted text-muted-foreground border-border',
};

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const resolveAvatar = (u: string | null | undefined): string | null => {
  if (!u) return null;
  if (u.startsWith('http')) return u;
  return supabase.storage.from('user-avatars').getPublicUrl(u).data.publicUrl;
};

export const ApproverRow: React.FC<Props> = ({ fullName, roleLabel, avatarUrl, chip, reserveChip }) => {
  const av = resolveAvatar(avatarUrl);
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
        {av && <AvatarImage src={av} alt={fullName || ''} />}
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
          {initialsOf(fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-tight truncate">
          {fullName || <span className="text-muted-foreground/70">Unassigned</span>}
        </div>
        {roleLabel && (
          <div className="text-[11px] text-muted-foreground truncate">{roleLabel}</div>
        )}
      </div>
      {chip ? (
        <span className={cn(
          'flex-none text-[10.5px] font-medium rounded-full border px-2 py-0.5',
          TONES[chip.tone],
        )}>
          {chip.label}
        </span>
      ) : reserveChip ? (
        <span className="flex-none w-[62px]" aria-hidden />
      ) : null}
    </div>
  );
};

export const approverDecisionChip = (
  d: 'APPROVED' | 'REJECTED' | null | undefined,
): ApproverRowChip => {
  if (d === 'APPROVED') return { label: 'Approved', tone: 'emerald' };
  if (d === 'REJECTED') return { label: 'Rejected', tone: 'red' };
  return { label: 'Pending', tone: 'slate' };
};
