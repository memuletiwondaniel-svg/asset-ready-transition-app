import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { normalizeCategoryCode } from './standardStatus';
import { useQualificationDetail } from '@/hooks/useQualificationDetail';
import type { VCRQualification } from '../../hooks/useVCRQualifications';

interface Props {
  qual: VCRQualification | null;
  vcrCode?: string;
  vcrName?: string;
  taskId?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const lifecycleOf = (q: VCRQualification): 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' => {
  if (q.status === 'APPROVED' || q.status === 'REJECTED') return q.status;
  if (q.status === 'DRAFT') return 'DRAFT';
  return 'PENDING';
};

const chipStyle = (lc: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED') => {
  switch (lc) {
    case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
    case 'PENDING':  return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'DRAFT':    return 'bg-slate-100 text-muted-foreground border-slate-200';
  }
};
const chipLabel = (lc: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED') =>
  lc === 'PENDING' ? 'Under review' : lc === 'DRAFT' ? 'Draft' : lc === 'APPROVED' ? 'Approved' : 'Rejected';

const approverChipStyle = (s: 'PENDING' | 'APPROVED' | 'REJECTED') => {
  if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'REJECTED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const itemCode = (q: VCRQualification) => {
  if (!q.prerequisite) return null;
  const cat = normalizeCategoryCode(q.prerequisite.category);
  if (cat === 'XX') return null;
  return formatVcrItemCode(cat, q.prerequisite.display_order ?? 0);
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">{label}</div>
    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{children}</div>
  </div>
);

export const QualificationDrawer: React.FC<Props> = ({ qual, vcrCode, vcrName, taskId, open, onOpenChange }) => {
  const { data: profiles } = useProfileUsers();
  const [currentUid, setCurrentUid] = useState<string | undefined>();
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUid(data.user?.id));
  }, []);
  const detail = useQualificationDetail(qual?.id);
  const [comment, setComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);

  if (!qual) return null;

  const lc = lifecycleOf(qual);
  const code = itemCode(qual);
  const profileById = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  const qId = `Q-${String(qual.q_number ?? 0).padStart(3, '0')}`;

  const raisedByProfile = qual.action_owner_id ? profileById.get(qual.action_owner_id) : null;
  const myApprover = detail.approvers.find(a => a.user_id === currentUid);
  const canDecide = !!myApprover && myApprover.status === 'PENDING' && lc === 'PENDING';

  const doDecide = (status: 'APPROVED' | 'REJECTED', c?: string) => {
    if (!myApprover) return;
    if (status === 'REJECTED' && !(c || '').trim()) return;
    detail.decide.mutate({ approverId: myApprover.id, status, comment: c, taskId }, {
      onSuccess: () => {
        setShowReject(false);
        setRejectComment('');
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col [&>button]:hidden">
        {/* Sticky stacked header */}
        <div className="px-5 pt-5 pb-3 border-b shrink-0 bg-background sticky top-0 z-10">
          <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground mb-0.5">
            {vcrCode || 'VCR'}{vcrName ? ` · ${vcrName}` : ''}
          </div>
          <div className="text-[15px] font-semibold leading-snug flex items-center gap-2">
            <span className="text-muted-foreground/70 font-mono text-xs">QUALIFICATION</span>
            <span>·</span>
            <span className="font-mono">{qId}</span>
            <span className={cn('ml-auto text-[10.5px] font-bold rounded-full border px-2 py-0.5 whitespace-nowrap shrink-0', chipStyle(lc))}>
              {chipLabel(lc)}
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5 text-sm">
            {/* Item chip + question (or custom title for ad-hoc quals) */}
            <div className="flex items-baseline gap-2 min-w-0">
              {code && (
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap shrink-0" style={{ background: '#EEF2F7' }}>
                  {code}
                </span>
              )}
              <span className="font-medium leading-snug truncate min-w-0">
                {qual.prerequisite?.summary
                  || qual.custom_title
                  || 'Ad-hoc qualification'}
              </span>
            </div>

            <Separator />

            <Section label="Reason">{qual.reason}</Section>
            {qual.mitigation && <Section label="Mitigation">{qual.mitigation}</Section>}
            {qual.follow_up_action && <Section label="Follow-up action">{qual.follow_up_action}</Section>}
            {qual.target_date && (
              <Section label="Target close-out">{format(new Date(qual.target_date), 'dd-MMM-yyyy')}</Section>
            )}

            <Separator />

            {/* Raised by */}
            <div className="space-y-2">
              <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">Raised by</div>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  {raisedByProfile?.avatar_url && <AvatarImage src={raisedByProfile.avatar_url} />}
                  <AvatarFallback className="text-[10px]">
                    {(raisedByProfile?.full_name || qual.action_owner_name || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">
                    {raisedByProfile?.full_name || qual.action_owner_name || '—'}
                  </div>
                  {qual.submitted_at && (
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(qual.submitted_at), 'dd-MMM-yyyy')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Approvers */}
            {detail.approvers.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
                  Approver{detail.approvers.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-2">
                  {detail.approvers.map(a => {
                    const p = profileById.get(a.user_id);
                    return (
                      <div key={a.id} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                          <AvatarFallback className="text-[10px]">
                            {(p?.full_name || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{p?.full_name || a.user_id}</div>
                          {a.role_label && (
                            <div className="text-[11px] text-muted-foreground truncate">{a.role_label}</div>
                          )}
                        </div>
                        <span className={cn('text-[10px] font-bold rounded-full border px-2 py-0.5', approverChipStyle(a.status))}>
                          {a.status === 'PENDING' ? 'Under review' : a.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Activity thread */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActivityOpen(v => !v)}
                className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 hover:text-foreground"
              >
                {activityOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Activity ({detail.comments.length})
              </button>
              {activityOpen && (
                <div className="space-y-3">
                  <div className="space-y-4">
                    {detail.comments.map(cm => {
                      const p = cm.author_user_id ? profileById.get(cm.author_user_id) : null;
                      const actionPhrase =
                        cm.action_tag === 'approved' ? 'approved'
                        : cm.action_tag === 'rejected' ? 'requested rework'
                        : cm.action_tag ? cm.action_tag
                        : 'commented';
                      const actionClass =
                        cm.action_tag === 'approved'
                          ? 'text-emerald-700 font-medium italic'
                          : cm.action_tag === 'rejected'
                          ? 'text-red-700 font-medium italic'
                          : 'text-muted-foreground italic';
                      const hasBody = !!cm.body;
                      return (
                        <div key={cm.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                            <AvatarFallback className="text-[10px]">
                              {(p?.full_name || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline gap-2 mb-0.5">
                              <span className="text-[13px] font-semibold truncate">
                                {p?.full_name || 'System'}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                                {format(new Date(cm.created_at), 'dd-MMM-yyyy HH:mm')}
                              </span>
                            </div>
                            <div className="text-[12px] leading-relaxed">
                              <span className={cn(actionClass)}>{actionPhrase}</span>
                              {hasBody && (
                                <>
                                  <span className="text-muted-foreground">:</span>{' '}
                                  <span className="text-foreground">{cm.body}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!comment.trim() || detail.addComment.isPending}
                      onClick={() => detail.addComment.mutate(comment.trim(), { onSuccess: () => setComment('') })}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Decision footer */}
        {canDecide && (
          <div className="border-t px-5 py-3 shrink-0 bg-background space-y-2">
            {showReject ? (
              <>
                <Textarea
                  value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Rejection reason (required)…"
                  className="min-h-[60px] text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setShowReject(false); setRejectComment(''); }}>Cancel</Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!rejectComment.trim() || detail.decide.isPending}
                    onClick={() => doDecide('REJECTED', rejectComment.trim())}
                  >
                    Confirm rejection
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={detail.decide.isPending}>Reject</Button>
                <Button size="sm" onClick={() => doDecide('APPROVED')} disabled={detail.decide.isPending}>Approve</Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
