import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ExternalLink, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  ProcedureStatusChip,
  procedureStatusMeta,
  PROCEDURE_TOTAL_STEPS,
} from './ProcedureStatusChip';
import {
  useProcedureLifecycle,
  ProcedureActivityRow,
  ProcedureLifecycleData,
} from './useProcedureLifecycle';
import { ApproverRow, approverDecisionChip } from '../shared/ApproverRow';

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const resolveAvatar = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return supabase.storage.from('user-avatars').getPublicUrl(avatar).data.publicUrl;
};

const KIND_SUFFIX: Record<string, string> = {
  draft: 'Draft',
  markup: 'Markup',
  reference: 'Reference',
};

const kindLabel = (k: string | null | undefined) => {
  if (!k) return '';
  return KIND_SUFFIX[k.toLowerCase()] || (k.charAt(0).toUpperCase() + k.slice(1));
};

/* -------------------- primitives -------------------- */

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
    {children}
  </div>
);

const SectionRule: React.FC = () => <div className="h-px bg-border/50 my-[18px]" />;

const Field: React.FC<{ label: string; value: React.ReactNode; full?: boolean }> = ({ label, value, full }) => (
  <div className={cn(full && 'col-span-2')}>
    <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-muted-foreground/80 mb-0.5">{label}</div>
    <div className="text-[12.5px] text-foreground leading-relaxed break-words">
      {value ?? <span className="text-muted-foreground/60">—</span>}
    </div>
  </div>
);

const ACTION_LABEL: Record<string, string> = {
  'Started draft': 'started drafting',
  'Submitted for review': 'submitted for review',
  'Resubmitted for review': 'resubmitted for review',
  'Approved procedure': 'approved',
  'Rejected procedure': 'requested rework',
};

const ActivityEntry: React.FC<{ a: ProcedureActivityRow }> = ({ a }) => {
  const av = resolveAvatar(a.actor_avatar_url);
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

/* -------------------- main drawer -------------------- */

export interface ProcedureDrawerProps {
  procedureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footerSlot?: (ctx: { data: ProcedureLifecycleData; currentUserId: string | null }) => React.ReactNode;
  currentUserId?: string | null;
}

const ASSAI_BASE = 'https://client.assaisoftware.com/documents/';

export const ProcedureDrawer: React.FC<ProcedureDrawerProps> = ({
  procedureId, open, onOpenChange, footerSlot, currentUserId = null,
}) => {
  const { data, isLoading } = useProcedureLifecycle(procedureId);
  const [activityOpen, setActivityOpen] = useState(false);

  const procedure = data?.procedure;
  const meta = procedure ? procedureStatusMeta(procedure.status) : null;
  const pct = meta ? Math.round((meta.step / PROCEDURE_TOTAL_STEPS) * 100) : 0;

  const decidedCount = (data?.approvers || []).filter((r) => r.decision != null).length;
  const totalApprovers = (data?.approvers || []).length;

  const changeLabel = procedure?.change_type
    ? (String(procedure.change_type).toLowerCase() === 'new' ? 'New procedure' : 'Update to existing')
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
        {/* G1 header — title + VCR-NN · Name subtext, one pill, no eyebrow, no X */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] leading-snug">
                {procedure?.title || <Skeleton className="h-4 w-40" />}
              </SheetTitle>
              {vcrCode && (
                <SheetDescription className="text-[12px] mt-0.5 truncate text-muted-foreground">
                  {vcrCode}{vcrName ? ` · ${vcrName}` : ''}
                </SheetDescription>
              )}
            </div>
            {procedure && <ProcedureStatusChip status={procedure.status} size="md" />}
          </div>
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
                Step {meta.step} of {PROCEDURE_TOTAL_STEPS}
              </div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            {isLoading || !procedure ? (
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
                  <Field label="Type" value={procedure.procedure_type || null} />
                  <Field label="Change" value={changeLabel} />
                  <Field label="Reason" full value={procedure.description || null} />
                  <Field
                    label="Applicable systems"
                    full
                    value={
                      data?.systems && data.systems.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {data.systems.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 text-[10.5px] font-medium rounded-full bg-slate-100 text-slate-700 px-2 py-0.5"
                            >
                              <span className="font-mono">{s.system_id || 'SYS'}</span>
                              <span className="text-slate-600">· {s.name || '—'}</span>
                            </span>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  <Field
                    label={procedure.status === 'APPROVED' ? 'Delivered' : 'Target date'}
                    value={
                      procedure.approved_at
                        ? format(new Date(procedure.approved_at), 'd MMM yyyy')
                        : procedure.target_date
                        ? format(new Date(procedure.target_date), 'd MMM yyyy')
                        : null
                    }
                  />
                  <Field label="Discipline" value={procedure.discipline_id ? '—' : null} />
                </div>

                {/* DOCUMENT */}
                <SectionRule />
                <Eyebrow>Document</Eyebrow>
                <div className="mt-2 text-[12.5px] leading-relaxed">
                  <div className="font-medium">{procedure.title}</div>
                  {procedure.document_number ? (
                    <a
                      href={`${ASSAI_BASE}${encodeURIComponent(procedure.document_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-primary hover:underline"
                    >
                      {procedure.document_number}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="mt-1 text-[11.5px] text-muted-foreground/70">
                      Document number not yet assigned.
                    </div>
                  )}
                </div>

                {/* AUTHOR */}
                {data?.author && (
                  <>
                    <SectionRule />
                    <Eyebrow>Author</Eyebrow>
                    <div className="mt-1">
                      <ApproverRow
                        fullName={data.author.full_name}
                        roleLabel={data.author.role_label}
                        avatarUrl={data.author.avatar_url}
                      />
                    </div>
                  </>
                )}

                {/* APPROVERS */}
                {totalApprovers > 0 && (
                  <>
                    <SectionRule />
                    <div className="flex items-center justify-between">
                      <Eyebrow>Approvers</Eyebrow>
                      <span className="text-[10.5px] text-muted-foreground">
                        {decidedCount} of {totalApprovers} decided
                      </span>
                    </div>
                    <div className="mt-1">
                      {data!.approvers.map((r) => (
                        <ApproverRow
                          key={r.id}
                          fullName={r.full_name}
                          roleLabel={r.role_label}
                          avatarUrl={r.avatar_url}
                          chip={approverDecisionChip(r.decision)}
                        />
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
                        const suffix = kindLabel(a.kind);
                        return (
                          <div key={a.id} className="flex items-center gap-2 text-[12.5px]">
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {a.file_url ? (
                              <a
                                href={a.file_url}
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
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ACTIVITY (Option A — collapsed by default) */}
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

        {procedure && data && footerSlot && (
          <div className="border-t px-5 py-3 shrink-0 bg-background">
            {footerSlot({ data, currentUserId })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
