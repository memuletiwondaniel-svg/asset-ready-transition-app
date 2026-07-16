import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Paperclip, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useProjectRoleHolders } from '@/hooks/useProjectRoleHolders';
import {
  WHPoint,
  WH_STATUS_PRESENTATION,
  typeLabel,
} from './useWHPoints';

const CHIP_TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  red:     'bg-red-50 text-red-700 border-red-200',
  slate:   'bg-slate-100 text-muted-foreground border-slate-200',
} as const;

const initials = (n: string) =>
  n.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const SectionLabel: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({
  children, action,
}) => (
  <div className="flex items-center justify-between">
    <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
      {children}
    </div>
    {action}
  </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; full?: boolean }> = ({
  label, value, full,
}) => (
  <div className={cn(full && 'col-span-2')}>
    <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80 mb-0.5">
      {label}
    </div>
    <div className="text-[12.5px] text-foreground leading-relaxed break-words">
      {value ?? <span className="text-muted-foreground/60">—</span>}
    </div>
  </div>
);

const accStatusChip = (s: 'PENDING' | 'APPROVED' | 'REJECTED') =>
  s === 'APPROVED'
    ? { label: 'Approved', tone: 'emerald' as const }
    : s === 'REJECTED'
    ? { label: 'Rejected', tone: 'red' as const }
    : { label: 'Pending',  tone: 'amber' as const };

const humanAction = (action: string): string => {
  switch (action) {
    case 'scheduled': return 'scheduled this point';
    case 'submitted': return 'submitted for review';
    case 'approved':  return 'approved';
    case 'rejected':  return 'requested rework';
    case 'reopened':  return 'reopened this point';
    case 'comment':   return 'commented';
    default: return action;
  }
};

export interface WitnessHoldDrawerProps {
  point: WHPoint | null;
  vcrCode: string;
  vcrName: string;
  projectId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSchedule?: (point: WHPoint) => void;
  onComplete?: (point: WHPoint) => void;
  onReview?: (point: WHPoint) => void;
  onEditParties?: (point: WHPoint) => void;
}

export const WitnessHoldDrawer: React.FC<WitnessHoldDrawerProps> = ({
  point, vcrCode, vcrName, projectId, open, onOpenChange,
  onSchedule, onComplete, onReview, onEditParties,
}) => {
  const [uid, setUid] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id));
  }, []);

  // Resolve delivering-party holder(s) + responsible Snr ORA Engr for gating
  const roleLabels: string[] = [];
  if (point?.delivering_party_role_name) roleLabels.push(point.delivering_party_role_name);
  if (!roleLabels.includes('Snr ORA Engr')) roleLabels.push('Snr ORA Engr');

  const { data: holders } = useProjectRoleHolders(projectId || undefined, roleLabels);

  if (!point) return null;

  const pres = WH_STATUS_PRESENTATION[point.status];
  const isHold = point.inspection_type === 'HOLD';
  const typeTone = isHold ? 'red' : 'blue';
  const deliveringHolders = holders?.[point.delivering_party_role_name || ''] || [];
  const snrOraHolders = holders?.['Snr ORA Engr'] || [];
  const isSnrOra = !!uid && snrOraHolders.some((h) => h.user_id === uid);
  const isDeliveringHolder = !!uid && deliveringHolders.some((h) => h.user_id === uid);
  const myPendingAcceptor = point.accepting_parties.find(
    (p) => p.user_id === uid && p.status === 'PENDING',
  );

  // Sticky footer CTA routing
  let cta: { label: string; onClick: () => void } | null = null;
  if (point.status === 'NOT_STARTED' && isSnrOra && onSchedule) {
    cta = { label: 'Schedule', onClick: () => onSchedule(point) };
  } else if (point.status === 'SCHEDULED' && isDeliveringHolder && onComplete) {
    cta = { label: 'Mark complete', onClick: () => onComplete(point) };
  } else if (point.status === 'REWORK_REQUESTED' && isDeliveringHolder && onComplete) {
    cta = { label: 'Resubmit', onClick: () => onComplete(point) };
  } else if (point.status === 'UNDER_REVIEW' && myPendingAcceptor && onReview) {
    cta = { label: 'Review & approve', onClick: () => onReview(point) };
  }

  const scheduleValue = point.scheduled_at
    ? format(new Date(point.scheduled_at), "dd-MMM-yyyy · HH:mm")
    : null;
  const completedValue = point.completed_at
    ? format(new Date(point.completed_at), 'dd-MMM-yyyy')
    : null;

  const systemDisplay = point.system
    ? `${point.system.system_id} · ${point.system.name}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col [&>button]:hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b shrink-0 bg-background">
          <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground mb-1">
            {vcrCode}{vcrName ? ` · ${vcrName}` : ''} · {typeLabel(point.inspection_type)}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="text-[15px] leading-snug font-semibold min-w-0 flex-1">
              {point.activity_name}
            </div>
            {point.status === 'SCHEDULED' && onSchedule ? (
              <button
                type="button"
                onClick={() => onSchedule(point)}
                className={cn(
                  'flex-none text-[10.5px] font-bold rounded-full border px-2 py-0.5 mt-0.5 whitespace-nowrap hover:brightness-95 cursor-pointer',
                  CHIP_TONES[pres.tone],
                )}
                aria-label="View schedule details"
              >
                {pres.label}
              </button>
            ) : (
              <span
                className={cn(
                  'flex-none text-[10.5px] font-bold rounded-full border px-2 py-0.5 mt-0.5 whitespace-nowrap',
                  CHIP_TONES[pres.tone],
                )}
              >
                {pres.label}
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5 text-sm">
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="System" value={systemDisplay} full />
              <Field
                label="Type"
                value={
                  <span className={cn(
                    'inline-flex text-[10.5px] font-bold rounded-full border px-2 py-0.5',
                    CHIP_TONES[typeTone],
                  )}>
                    {isHold ? 'Hold' : 'Witness'}
                  </span>
                }
              />
              <Field
                label={completedValue ? 'Completed' : 'Scheduled'}
                value={completedValue || scheduleValue}
              />
            </div>

            <Separator />

            {/* Delivered by */}
            <div className="space-y-2">
              <SectionLabel>Delivered by</SectionLabel>
              {point.delivering_party_role_name ? (
                deliveringHolders.length ? (
                  <div className="space-y-1.5">
                    {deliveringHolders.map((h) => (
                      <div key={h.user_id} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {h.avatar_url && <AvatarImage src={h.avatar_url} />}
                          <AvatarFallback className="text-[10px]">
                            {initials(h.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium truncate">{h.full_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {point.delivering_party_role_name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-foreground/70">
                    {point.delivering_party_role_name} — no holder resolved
                  </div>
                )
              ) : (
                <div className="text-[12px] text-muted-foreground/70">
                  Delivering party not yet assigned
                </div>
              )}
            </div>

            {/* Witnessed & accepted by */}
            <div className="space-y-2">
              <SectionLabel>Witnessed &amp; accepted by</SectionLabel>
              {point.accepting_parties.length === 0 ? (
                <div className="text-[12px] text-muted-foreground/70">
                  No accepting parties assigned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {point.accepting_parties.map((ap) => {
                    const chip = accStatusChip(ap.status);
                    const showChip =
                      point.status === 'UNDER_REVIEW' ||
                      point.status === 'COMPLETED' ||
                      point.status === 'REWORK_REQUESTED';
                    return (
                      <div key={ap.id} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {ap.user_avatar_url && <AvatarImage src={ap.user_avatar_url} />}
                          <AvatarFallback className="text-[10px]">
                            {initials(ap.user_full_name || ap.role_name || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-medium truncate">
                            {ap.user_full_name || <span className="text-muted-foreground/70">Unassigned</span>}
                          </div>
                          {ap.role_name && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {ap.role_name}
                            </div>
                          )}
                        </div>
                        {showChip && (
                          <span className={cn(
                            'text-[10px] font-bold rounded-full border px-2 py-0.5 shrink-0',
                            CHIP_TONES[chip.tone],
                          )}>
                            {chip.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {point.outcome_summary && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionLabel>Outcome</SectionLabel>
                  <div className="text-[12.5px] whitespace-pre-wrap leading-relaxed">
                    {point.outcome_summary}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Attachments */}
            <div className="space-y-2">
              <SectionLabel>Attachments</SectionLabel>
              {point.attachments.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-[12px] text-muted-foreground text-center">
                  No attachments uploaded yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {point.attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-1 py-1">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium truncate">{a.file_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Activity thread — chipless split-header */}
            <div className="space-y-2">
              <SectionLabel>Activity</SectionLabel>
              {point.activity_log.length === 0 ? (
                <div className="text-[12px] text-muted-foreground/70">
                  No activity yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {point.activity_log.map((entry) => {
                    const actionClass =
                      entry.action === 'approved'
                        ? 'text-emerald-700 font-medium italic'
                        : entry.action === 'rejected'
                        ? 'text-red-700 font-medium italic'
                        : 'text-muted-foreground italic';
                    const hasComment = !!entry.comment;
                    return (
                      <div key={entry.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {entry.user_avatar_url && <AvatarImage src={entry.user_avatar_url} />}
                          <AvatarFallback className="text-[10px]">
                            {initials(entry.user_full_name || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline gap-2 mb-0.5">
                            <span className="text-[13px] font-semibold truncate">
                              {entry.user_full_name || 'System'}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                              {format(new Date(entry.created_at), 'dd-MMM-yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="text-[12px] leading-relaxed">
                            <span className={cn(actionClass)}>
                              {humanAction(entry.action)}
                            </span>
                            {hasComment && (
                              <>
                                <span className="text-muted-foreground">:</span>{' '}
                                <span className="text-foreground">{entry.comment}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Sticky footer CTA */}
        {cta && (
          <div className="border-t px-5 py-3 shrink-0 bg-background flex justify-end">
            <Button size="sm" onClick={cta.onClick}>{cta.label}</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
