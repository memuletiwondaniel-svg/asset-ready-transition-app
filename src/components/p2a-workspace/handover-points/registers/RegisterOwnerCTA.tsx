import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useRegisterOwnership } from './useRegisterLifecycle';
import { useRegisterActions } from './useRegisterActions';
import { ReviewerPickerList, ReviewerPick } from '../training/modals/ReviewerPickerList';
import type { RegisterLifecycleData } from './useRegisterLifecycle';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Modal = 'start_draft' | 'submit_review' | 'resubmit' | 'review' | null;

interface Props {
  data: RegisterLifecycleData;
  currentUserId: string | null;
  autoOpen?: boolean;
}

const SubText: React.FC<{ title: string; kind?: string | null; activity?: string | null }> = ({ title, kind, activity }) => (
  <div className="space-y-1">
    <div className="text-[15px] font-semibold leading-tight">{title}</div>
    <div className="text-[12px] text-muted-foreground truncate">
      {kind || 'Register'} · {activity || 'Delivery'}
    </div>
  </div>
);

/* ---------- Start draft slim confirm ---------- */
const StartDraftModal: React.FC<{ registerId: string; title: string; open: boolean; onClose: () => void }> = ({ registerId, title, open, onClose }) => {
  const { mutate, isPending } = useRegisterActions(registerId);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="!z-modal-critical max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Start draft?</AlertDialogTitle>
          <AlertDialogDescription>
            Begin drafting <span className="font-medium text-foreground">{title}</span>. You can continue editing before submitting for review.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => mutate({ action: 'start_draft' }, {
              onSuccess: () => { toast.success('Draft started'); onClose(); },
            })}
          >
            {isPending ? 'Starting…' : 'Start draft'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/* ---------- Submit / Resubmit for review ---------- */
const SubmitModal: React.FC<{
  registerId: string;
  title: string;
  kind: string | null;
  activity: string | null;
  isResubmit: boolean;
  existing: ReviewerPick[];
  reworkContext?: { reviewerName: string | null; comment: string | null; at: string }[];
  open: boolean;
  onClose: () => void;
}> = ({ registerId, title, kind, activity, isResubmit, existing, reworkContext, open, onClose }) => {
  const [reviewers, setReviewers] = useState<ReviewerPick[]>(existing);
  const [comment, setComment] = useState('');
  const { mutate, isPending } = useRegisterActions(registerId);
  const canSubmit = reviewers.length > 0 && !isPending;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!z-modal-critical max-w-lg">
        <DialogHeader>
          <DialogTitle asChild><SubText title={isResubmit ? 'Resubmit for review' : 'Submit for review'} kind={kind} activity={activity} /></DialogTitle>
        </DialogHeader>
        <div className="space-y-[18px]">
          <div className="text-[11px] text-muted-foreground">
            Register title · <span className="font-medium text-foreground">{title}</span>
          </div>
          {isResubmit && reworkContext && reworkContext.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-[11.5px] text-red-900 space-y-1">
              <div className="font-semibold uppercase tracking-wide text-[10px]">Rework requested</div>
              {reworkContext.map((r, i) => (
                <div key={i}>
                  <span className="font-medium">{r.reviewerName || 'Reviewer'}:</span> {r.comment || '—'}
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80 mb-1.5">
              Accepting parties
            </div>
            <ReviewerPickerList value={reviewers} onChange={setReviewers} disabled={isPending} />
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80 mb-1.5">
              Comments <span className="text-muted-foreground/60 font-normal">(optional)</span>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Notes for reviewers…"
              className="text-[12.5px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            disabled={!canSubmit}
            className={cn(!canSubmit && 'opacity-60')}
            onClick={() => mutate({
              action: isResubmit ? 'resubmit' : 'submit_for_review',
              comment: comment.trim() || null,
              reviewerIds: reviewers.map((r) => r.user_id),
            }, {
              onSuccess: () => { toast.success(isResubmit ? 'Resubmitted for review' : 'Submitted for review'); onClose(); },
            })}
          >
            {isPending ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Review decision (approve / reject with mandatory comments) ---------- */
const ReviewModal: React.FC<{
  registerId: string;
  title: string;
  kind: string | null;
  activity: string | null;
  authorName: string | null;
  decidedCount: number;
  totalReviewers: number;
  open: boolean;
  onClose: () => void;
}> = ({ registerId, title, kind, activity, authorName, decidedCount, totalReviewers, open, onClose }) => {
  const [comment, setComment] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const { mutate, isPending } = useRegisterActions(registerId);
  const canDecide = comment.trim().length > 0 && !isPending;

  return (
    <>
      <Dialog open={open && !confirmReject} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="!z-modal-critical max-w-lg">
          <DialogHeader>
            <DialogTitle asChild><SubText title="Review register" kind={kind} activity={activity} /></DialogTitle>
          </DialogHeader>
          <div className="space-y-[18px]">
            <div className="text-[11.5px] text-muted-foreground">
              <span className="font-medium text-foreground">{title}</span>
              {authorName && <> · from <span className="font-medium text-foreground">{authorName}</span></>}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {decidedCount} of {totalReviewers} reviewers decided
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80 mb-1.5">
                Comments <span className="text-red-600">*</span>
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Your feedback (required for both decisions)…"
                className="text-[12.5px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button
              variant="outline"
              disabled={!canDecide}
              className={cn('border-red-300 text-red-700 hover:bg-red-50', !canDecide && 'opacity-60')}
              onClick={() => setConfirmReject(true)}
            >
              Reject
            </Button>
            <Button
              disabled={!canDecide}
              className={cn(!canDecide && 'opacity-60')}
              onClick={() => mutate({ action: 'approve', comment: comment.trim() }, {
                onSuccess: () => { toast.success('Approved'); onClose(); },
              })}
            >
              {isPending ? 'Submitting…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReject} onOpenChange={(o) => !o && setConfirmReject(false)}>
        <AlertDialogContent className="!z-modal-critical max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Return to {authorName || 'author'} for rework?</AlertDialogTitle>
            <AlertDialogDescription>
              This cancels sibling review tasks and reopens the draft on the author.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
              onClick={() => mutate({ action: 'reject', comment: comment.trim() }, {
                onSuccess: () => { toast.success('Sent back for rework'); setConfirmReject(false); onClose(); },
              })}
            >
              {isPending ? 'Submitting…' : 'Return for rework'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/* ---------- Owner CTA ---------- */
export const RegisterOwnerCTA: React.FC<Props> = ({ data, currentUserId, autoOpen }) => {
  const { register, reviewers, activity, author } = data;
  const [modal, setModal] = useState<Modal>(null);
  const [autoActed, setAutoActed] = useState(false);
  const { data: ownership } = useRegisterOwnership(register?.id ?? null, currentUserId);

  const status = (register?.workflow_status ?? '') as string;

  const myReviewer = currentUserId
    ? reviewers.find((r) => r.reviewer_id === currentUserId && r.decision === 'pending')
    : null;
  const canReviewNow = status === 'UNDER_REVIEW' && !!ownership?.isReviewer && !!myReviewer;
  const canOwnAction = !!ownership?.isOwner;

  const cta = useMemo<{ text: string; modal: Modal } | null>(() => {
    if (!register) return null;
    if (canReviewNow) return { text: 'Review register', modal: 'review' };
    if (!canOwnAction) return null;
    switch (status) {
      case 'NOT_STARTED': return { text: 'Start draft', modal: 'start_draft' };
      case 'DRAFT': return { text: 'Submit for review', modal: 'submit_review' };
      case 'REWORK_REQUESTED': return { text: 'Resubmit for review', modal: 'resubmit' };
      default: return null;
    }
  }, [register, canReviewNow, canOwnAction, status]);

  useEffect(() => {
    if (!autoOpen || autoActed || !cta) return;
    setModal(cta.modal);
    setAutoActed(true);
  }, [autoOpen, autoActed, cta]);

  if (!register || !cta) return null;

  const decidedCount = reviewers.filter((r) => r.decision && r.decision !== 'pending').length;
  const totalReviewers = reviewers.length;
  const kind = register.register_kind ? String(register.register_kind) : null;
  const act = register.activity_kind
    ? (String(register.activity_kind).toUpperCase() === 'NEW' ? 'New' : 'Update existing')
    : null;

  const existing: ReviewerPick[] = reviewers.map((r) => ({
    user_id: r.reviewer_id,
    full_name: r.full_name,
    avatar_url: r.avatar_url,
    role_label: r.role_label,
  }));

  const reworkContext = activity
    .filter((a) => a.action === 'rejected')
    .map((a) => ({ reviewerName: a.actor_name, comment: a.comment, at: a.created_at }));

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="h-8 text-[12.5px]" onClick={() => setModal(cta.modal)}>
          {cta.text}
        </Button>
      </div>

      {modal === 'start_draft' && (
        <StartDraftModal registerId={register.id} title={register.title} open onClose={() => setModal(null)} />
      )}
      {(modal === 'submit_review' || modal === 'resubmit') && (
        <SubmitModal
          registerId={register.id}
          title={register.title}
          kind={kind}
          activity={act}
          isResubmit={modal === 'resubmit'}
          existing={existing}
          reworkContext={modal === 'resubmit' ? reworkContext : undefined}
          open
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'review' && myReviewer && (
        <ReviewModal
          registerId={register.id}
          title={register.title}
          kind={kind}
          activity={act}
          authorName={author?.full_name ?? null}
          decidedCount={decidedCount}
          totalReviewers={totalReviewers}
          open
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
};
