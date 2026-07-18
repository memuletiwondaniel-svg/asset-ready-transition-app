import React, { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Download, ExternalLink, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TrainingStatusChip,
  trainingStatusMeta,
  TRAINING_TOTAL_STEPS,
} from './TrainingStatusChip';
import { useTrainingLifecycle, TrainingReviewerRow, TrainingAttachmentRow, TrainingActivityRow } from './useTrainingLifecycle';

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const resolveAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return supabase.storage.from('user-avatars').getPublicUrl(avatar).data.publicUrl;
};

const KIND_SUFFIX: Record<string, string> = {
  draft: 'Draft',
  material: 'Materials',
  materials: 'Materials',
  markup: 'Markup',
  evidence: 'Evidence',
  po: 'PO',
  attendance: 'Attendance list',
};

const kindLabel = (kind: string | null | undefined) => {
  if (!kind) return '';
  const k = kind.toLowerCase();
  return KIND_SUFFIX[k] || (kind.charAt(0).toUpperCase() + kind.slice(1));
};

const attachmentHref = (a: TrainingAttachmentRow): string | null => {
  if (!a.file_path) return null;
  // Choose bucket by kind: evidence → training-evidence (public); others → training-materials
  const bucket = a.kind === 'evidence' ? 'training-evidence' : 'training-materials';
  const { data } = supabase.storage.from(bucket).getPublicUrl(a.file_path);
  return data?.publicUrl || null;
};

/* -------------------- Small primitives -------------------- */

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
    {children}
  </div>
);

const SectionRule: React.FC = () => <div className="h-px bg-border/50 my-[18px]" />;

/* -------------------- Reviewer row (stacked, no separators) -------------------- */

const decisionMeta = (d: TrainingReviewerRow['decision']) => {
  if (d === 'APPROVED') return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' };
  if (d === 'REJECTED') return { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30' };
  return { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' };
};

const ReviewerRow: React.FC<{ r: TrainingReviewerRow }> = ({ r }) => {
  const meta = decisionMeta(r.decision);
  const av = resolveAvatarUrl(r.avatar_url);
  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
        {av && <AvatarImage src={av} alt={r.full_name || ''} />}
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
          {initialsOf(r.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-tight truncate">
          {r.full_name || 'Unknown reviewer'}
        </div>
        {r.role_label && (
          <div className="text-[11px] text-muted-foreground truncate">{r.role_label}</div>
        )}
      </div>
      <span className={cn(
        'flex-none text-[10.5px] font-medium rounded-full border px-2 py-0.5',
        meta.className,
      )}>
        {meta.label}
      </span>
    </div>
  );
};

/* -------------------- Activity thread (Option A) -------------------- */

const ACTION_LABEL: Record<string, string> = {
  submit_for_review: 'submitted for review',
  submit_review: 'submitted for review',
  resubmit: 'resubmitted for review',
  approve: 'approved',
  reject: 'requested rework',
  schedule: 'scheduled the session',
  complete: 'marked completed',
  po_provided: 'provided PO',
  attendance_provided: 'uploaded attendance list',
  status_advanced: 'advanced status',
};

const ActivityEntry: React.FC<{ a: TrainingActivityRow }> = ({ a }) => {
  const av = resolveAvatarUrl(a.actor_avatar_url);
  const label = ACTION_LABEL[a.action] || a.action.replace(/_/g, ' ');
  return (
    <div className="flex gap-2.5 py-2">
      <Avatar className="h-6 w-6 mt-0.5 shrink-0">
        {av && <AvatarImage src={av} alt={a.actor_name || ''} />}
        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
          {initialsOf(a.actor_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] leading-snug">
          <span className="font-medium text-foreground">{a.actor_name || 'Someone'}</span>{' '}
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground/70">
            {' · '}
            {format(new Date(a.created_at), 'd MMM yyyy, HH:mm')}
          </span>
        </div>
        {a.comment && (
          <div className="mt-1 text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {a.comment}
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------- Main drawer -------------------- */

export interface TrainingDrawerProps {
  trainingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrCode?: string;
  vcrName?: string;
  /** Renderer receives full lifecycle data + currentUserId so callers can render owner-gated CTAs. */
  footerSlot?: (ctx: { data: any; currentUserId: string | null }) => React.ReactNode;
  currentUserId?: string | null;
}

export const TrainingDrawer: React.FC<TrainingDrawerProps> = ({
  trainingId, open, onOpenChange, footerSlot, currentUserId = null, vcrCode, vcrName,
}) => {
  const { data, isLoading } = useTrainingLifecycle(trainingId);
  const [activityOpen, setActivityOpen] = useState(false);

  const training = data?.training;
  const meta = training ? trainingStatusMeta(training.status) : null;
  const pct = meta ? Math.round((meta.step / TRAINING_TOTAL_STEPS) * 100) : 0;

  const decidedCount = (data?.reviewers || []).filter((r) => r.decision != null).length;
  const totalReviewers = (data?.reviewers || []).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
        {/* G1 header — title + VCR-NN · Name subtext, one pill, no eyebrow, no X */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] leading-snug">
                {training?.title || <Skeleton className="h-4 w-40" />}
              </SheetTitle>
              {vcrCode && (
                <SheetDescription className="text-[12px] mt-0.5 truncate text-muted-foreground">
                  {vcrCode}{vcrName ? ` · ${vcrName}` : ''}
                </SheetDescription>
              )}
            </div>
            {training && <TrainingStatusChip status={training.status} size="md" />}
          </div>
          {/* Progress bar + Step N of 8 caption */}
          {meta && (
            <div className="mt-3 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    meta.tone === 'emerald' ? 'bg-emerald-500' :
                    meta.tone === 'blue' ? 'bg-blue-500' :
                    meta.tone === 'amber' ? 'bg-amber-500' :
                    meta.tone === 'red' ? 'bg-red-500' : 'bg-slate-400',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                Step {meta.step} of {TRAINING_TOTAL_STEPS}
              </div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            {isLoading || !training ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                {/* DETAILS */}
                <Eyebrow>Details</Eyebrow>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
                  <Field label="Provider" value={training.training_provider} />
                  <Field label="Duration" value={training.duration_hours ? `${training.duration_hours} h` : null} />
                  <Field label="Estimated cost" value={training.estimated_cost ? `$${Number(training.estimated_cost).toLocaleString()}` : null} />
                  <Field
                    label={training.status === 'COMPLETED' ? 'Delivered' : 'Target date'}
                    value={
                      training.scheduled_date
                        ? format(new Date(training.scheduled_date), 'd MMM yyyy')
                        : training.target_date
                        ? format(new Date(training.target_date), 'd MMM yyyy')
                        : training.tentative_date
                        ? format(new Date(training.tentative_date), 'd MMM yyyy')
                        : null
                    }
                  />
                  <Field label="Delivery method" value={
                    Array.isArray(training.delivery_method) && training.delivery_method.length
                      ? training.delivery_method.join(' · ') : null
                  } />
                  <Field label="Target audience" value={
                    Array.isArray(training.target_audience) && training.target_audience.length
                      ? training.target_audience.join(' · ') : null
                  } full />
                  <Field
                    label="Applicable systems"
                    full
                    value={
                      data?.systems?.length
                        ? (
                          <div className="flex flex-wrap gap-1.5">
                            {data.systems.map((s) => (
                              <span key={s.id} className="inline-flex items-center gap-1 text-[10.5px] font-medium rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
                                <span className="font-mono">{s.system_id || 'SYS'}</span>
                                <span className="text-slate-600">· {s.name || '—'}</span>
                              </span>
                            ))}
                          </div>
                        )
                        : null
                    }
                  />
                  {training.description && (
                    <Field label="Objective" full value={training.description} />
                  )}
                </div>

                {/* SCHEDULE (when scheduled or completed) */}
                {(training.status === 'SCHEDULED' || training.status === 'COMPLETED') && (training.scheduled_start_time || training.scheduled_location) && (
                  <>
                    <SectionRule />
                    <Eyebrow>Schedule</Eyebrow>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
                      <Field
                        label="Time"
                        value={[training.scheduled_start_time, training.scheduled_end_time].filter(Boolean).join(' – ') || null}
                      />
                      <Field label="Location" value={training.scheduled_location} />
                      {training.scheduled_notes && (
                        <Field label="Notes" full value={training.scheduled_notes} />
                      )}
                    </div>
                  </>
                )}

                {/* AUTHOR */}
                {data?.author && (
                  <>
                    <SectionRule />
                    <Eyebrow>Author</Eyebrow>
                    <div className="mt-2">
                      <ReviewerRow r={{
                        id: 'author',
                        training_id: training.id,
                        user_id: data.author.user_id || '',
                        role_label: 'Author',
                        decision: null,
                        decision_comment: null,
                        decided_at: null,
                        markup_attachment_id: null,
                        full_name: data.author.full_name,
                        avatar_url: data.author.avatar_url,
                      }} />
                    </div>
                  </>
                )}

                {/* REVIEWERS */}
                {totalReviewers > 0 && (
                  <>
                    <SectionRule />
                    <div className="flex items-center justify-between">
                      <Eyebrow>Reviewers</Eyebrow>
                      <span className="text-[10.5px] text-muted-foreground">
                        {decidedCount} of {totalReviewers} decided
                      </span>
                    </div>
                    <div className="mt-1">
                      {data!.reviewers.map((r) => (
                        <ReviewerRow key={r.id} r={r} />
                      ))}
                    </div>
                  </>
                )}

                {/* ATTACHMENTS */}
                {data && data.attachments.length > 0 && (
                  <>
                    <SectionRule />
                    <Eyebrow>Attachments</Eyebrow>
                    <div className="mt-2 space-y-1.5">
                      {data.attachments.map((a) => {
                        const href = attachmentHref(a);
                        const suffix = kindLabel(a.kind);
                        return (
                          <div key={a.id} className="flex items-center gap-2 text-[12.5px]">
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium truncate"
                              >
                                {a.file_name}
                              </a>
                            ) : (
                              <span className="font-medium truncate">{a.file_name}</span>
                            )}
                            {suffix && (
                              <span className="text-muted-foreground shrink-0">· {suffix}</span>
                            )}
                            {href && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open attachment"
                                className="ml-auto text-muted-foreground hover:text-foreground"
                              >
                                {a.kind === 'evidence' ? (
                                  <Download className="w-3.5 h-3.5" />
                                ) : (
                                  <ExternalLink className="w-3.5 h-3.5" />
                                )}
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ACTIVITY (collapsed by default, Option A) */}
                {data && data.activity.length > 0 && (
                  <>
                    <SectionRule />
                    <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
                      <div className="flex items-center justify-between">
                        <Eyebrow>Activity</Eyebrow>
                        <CollapsibleTrigger className="text-[10.5px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                          {activityOpen ? 'Hide' : `Show (${data.activity.length})`}
                          <ChevronDown className={cn('h-3 w-3 transition-transform', activityOpen && 'rotate-180')} />
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="mt-2 divide-y divide-border/40">
                          {data.activity.map((a) => (
                            <ActivityEntry key={a.id} a={a} />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer — owner-only CTA slot (populated by FE-3). */}
        {training && footerSlot && (
          <div className="border-t px-5 py-3 shrink-0 bg-background">
            {footerSlot({ data, currentUserId })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode; full?: boolean }> = ({ label, value, full }) => (
  <div className={cn(full && 'col-span-2')}>
    <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80 mb-0.5">{label}</div>
    <div className="text-[12.5px] text-foreground leading-relaxed break-words">
      {value ?? <span className="text-muted-foreground/60">—</span>}
    </div>
  </div>
);
