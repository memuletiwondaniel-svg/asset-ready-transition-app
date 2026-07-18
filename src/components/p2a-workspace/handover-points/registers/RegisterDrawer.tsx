import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { RegisterStatusChip, registerStatusMeta } from './RegisterStatusChip';
import {
  useRegisterLifecycle,
  RegisterActivityRow,
  RegisterLifecycleData,
} from './useRegisterLifecycle';
import { ApproverRow, approverDecisionChip } from '../shared/ApproverRow';

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const resolveAvatar = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return supabase.storage.from('user-avatars').getPublicUrl(avatar).data.publicUrl;
};

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
  started_draft: 'started drafting',
  submitted_for_review: 'submitted for review',
  resubmitted: 'resubmitted for review',
  approved: 'approved',
  rejected: 'requested rework',
};

const ActivityEntry: React.FC<{ a: RegisterActivityRow }> = ({ a }) => {
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

export interface RegisterDrawerProps {
  registerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrCode?: string;
  vcrName?: string;
  footerSlot?: (ctx: { data: RegisterLifecycleData; currentUserId: string | null }) => React.ReactNode;
  currentUserId?: string | null;
}

export const RegisterDrawer: React.FC<RegisterDrawerProps> = ({
  registerId, open, onOpenChange, footerSlot, currentUserId = null, vcrCode, vcrName,
}) => {
  const { data, isLoading } = useRegisterLifecycle(registerId);
  const [activityOpen, setActivityOpen] = useState(false);

  const register = data?.register;
  const meta = register ? registerStatusMeta(register.workflow_status) : null;

  const decidedCount = (data?.reviewers || []).filter((r) => r.decision && r.decision !== 'pending').length;
  const totalReviewers = (data?.reviewers || []).length;

  const kindLabel = register?.register_kind
    ? String(register.register_kind).charAt(0).toUpperCase() + String(register.register_kind).slice(1).toLowerCase()
    : null;
  const activityLabel = register?.activity_kind
    ? (String(register.activity_kind).toUpperCase() === 'NEW' ? 'New' : 'Update existing')
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] leading-snug">
                {register?.title || <Skeleton className="h-4 w-40" />}
              </SheetTitle>
              {vcrCode && (
                <SheetDescription className="text-[12px] mt-0.5 truncate text-muted-foreground">
                  {vcrCode}{vcrName ? ` · ${vcrName}` : ''}
                </SheetDescription>
              )}
            </div>
            {register && <RegisterStatusChip status={register.workflow_status} size="md" />}
          </div>
          {meta && (
            <div className="mt-3 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    meta.tone === 'emerald' ? 'bg-emerald-500' :
                    meta.tone === 'amber' ? 'bg-amber-500' :
                    meta.tone === 'red' ? 'bg-red-500' : 'bg-slate-400',
                  )}
                  style={{ width: `${Math.round((meta.step / 4) * 100)}%` }}
                />
              </div>
              <div className="text-[10.5px] text-muted-foreground">Step {meta.step} of 4</div>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            {isLoading || !register ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <Eyebrow>Details</Eyebrow>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2">
                  <Field label="Type" value={kindLabel} />
                  <Field label="Activity" value={activityLabel} />
                  <Field
                    label={register.workflow_status === 'APPROVED' ? 'Approved' : 'Target date'}
                    value={
                      register.approved_at
                        ? format(new Date(register.approved_at), 'd MMM yyyy')
                        : register.target_date
                        ? format(new Date(register.target_date), 'd MMM yyyy')
                        : null
                    }
                  />
                  <Field label="Scope" value={register.scope || register.description || null} full />
                </div>

                {data?.author && (
                  <>
                    <SectionRule />
                    <Eyebrow>Delivering party</Eyebrow>
                    <div className="mt-1">
                      <ApproverRow
                        fullName={data.author.full_name}
                        roleLabel={data.author.role_label}
                        avatarUrl={data.author.avatar_url}
                      />
                    </div>
                  </>
                )}

                {totalReviewers > 0 && (
                  <>
                    <SectionRule />
                    <div className="flex items-center justify-between">
                      <Eyebrow>Accepting parties</Eyebrow>
                      <span className="text-[10.5px] text-muted-foreground">
                        {decidedCount} of {totalReviewers} decided
                      </span>
                    </div>
                    <div className="mt-1">
                      {data!.reviewers.map((r) => {
                        const dec =
                          r.decision === 'approved' ? 'APPROVED' :
                          r.decision === 'rejected' ? 'REJECTED' : null;
                        return (
                          <ApproverRow
                            key={r.id}
                            fullName={r.full_name}
                            roleLabel={r.role_label}
                            avatarUrl={r.avatar_url}
                            chip={approverDecisionChip(dec)}
                          />
                        );
                      })}
                    </div>
                  </>
                )}

                {data && data.attachments.length > 0 && (
                  <>
                    <SectionRule />
                    <Eyebrow>Attachments</Eyebrow>
                    <div className="mt-2 space-y-1.5">
                      {data.attachments.map((a) => {
                        const suffix = a.attachment_kind
                          ? a.attachment_kind.charAt(0).toUpperCase() + a.attachment_kind.slice(1)
                          : '';
                        return (
                          <div key={a.id} className="flex items-center gap-2 text-[12.5px]">
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {a.file_path ? (
                              <a
                                href={a.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary hover:underline font-medium truncate"
                              >
                                {a.file_name}
                              </a>
                            ) : (
                              <span className="font-medium truncate">{a.file_name}</span>
                            )}
                            {suffix && <span className="text-muted-foreground shrink-0">· {suffix}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

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

        {register && data && footerSlot && (
          <div className="border-t px-5 py-3 shrink-0 bg-background">
            {footerSlot({ data, currentUserId })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
