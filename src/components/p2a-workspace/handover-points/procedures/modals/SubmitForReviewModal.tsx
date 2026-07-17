import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProcedureActions } from '../useProcedureActions';
import { ModalTitleBlock, ModalSection } from './ProcedureModalPrimitives';
import {
  ReviewerPickerList,
  ReviewerPick,
} from '../../training/modals/ReviewerPickerList';
import type { ProcedureApproverRow } from '../useProcedureLifecycle';

interface Props {
  procedureId: string;
  procedureTitle: string;
  documentNumber?: string | null;
  existingApprovers: ProcedureApproverRow[];
  isResubmit: boolean;
  /** Rejection context to surface inline when re-submitting after REWORK_REQUESTED. */
  reworkContext?: {
    reviewerName: string | null;
    comment: string | null;
    at: string | null;
  }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Submit-for-Review modal — author picks approvers (multi) and adds an
 * optional cover comment. Uses the same approver picker as Training. When
 * launched from REWORK_REQUESTED it also surfaces the prior rejection
 * context inline (reviewer name + comment).
 */
export const SubmitForReviewModal: React.FC<Props> = ({
  procedureId, procedureTitle, documentNumber, existingApprovers, isResubmit,
  reworkContext, open, onOpenChange,
}) => {
  const [approvers, setApprovers] = useState<ReviewerPick[]>([]);
  const [comment, setComment] = useState('');
  const mutation = useProcedureActions(procedureId);

  useEffect(() => {
    if (!open) return;
    // Seed with the existing approver list (Training pattern).
    setApprovers(
      existingApprovers.map((a) => ({
        user_id: a.user_id,
        full_name: a.full_name,
        avatar_url: a.avatar_url,
        role_label: a.role_label,
      })),
    );
    setComment('');
  }, [open, existingApprovers]);

  const canSubmit = approvers.length > 0 && !mutation.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    await mutation.mutateAsync({
      action: isResubmit ? 'resubmit' : 'submit_review',
      payload: {
        approvers: approvers.map((a) => ({ user_id: a.user_id, role_label: a.role_label ?? null })),
        comment: comment.trim() || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[1420]">
        <DialogHeader>
          <ModalTitleBlock
            title={isResubmit ? 'Resubmit for review' : 'Submit for review'}
            procedureTitle={procedureTitle}
            documentNumber={documentNumber}
          />
        </DialogHeader>

        {isResubmit && reworkContext && reworkContext.length > 0 && (
          <ModalSection label="Rejection context">
            <div className="rounded-md border bg-rose-50/40 dark:bg-rose-500/5 border-rose-200/70 px-3 py-2 space-y-2">
              {reworkContext.map((r, i) => (
                <div key={i} className="text-[12px]">
                  <span className="font-medium">{r.reviewerName || 'Reviewer'}</span>
                  <span className="text-muted-foreground"> requested rework</span>
                  {r.comment && (
                    <div className="mt-0.5 text-[12px] text-foreground/90 whitespace-pre-wrap">
                      {r.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ModalSection>
        )}

        <ModalSection label="Approvers *">
          <ReviewerPickerList value={approvers} onChange={setApprovers} disabled={mutation.isPending} />
        </ModalSection>

        <ModalSection label="Comments">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional — anything reviewers should know"
            className="min-h-[90px] text-[12.5px]"
          />
        </ModalSection>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {mutation.isPending ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit for review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
