import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useProcedureOwnership } from './useProcedureOwnership';
import type { ProcedureLifecycleData } from './useProcedureLifecycle';
import { StartDraftConfirmModal } from './modals/StartDraftConfirmModal';
import { SubmitForReviewModal } from './modals/SubmitForReviewModal';
import { ProcedureReviewDecisionModal } from './modals/ProcedureReviewDecisionModal';

type Modal = 'start_draft' | 'submit_review' | 'resubmit' | 'review' | null;

interface Props {
  data: ProcedureLifecycleData;
  currentUserId: string | null;
  /** When true, auto-opens the state-appropriate modal (task launcher path). */
  autoOpen?: boolean;
}

/**
 * Owner/reviewer footer CTA for the Procedure drawer. Visibility is gated
 * by an open user_tasks row for the caller (mirrors the DB gate in
 * advance_procedure_status). Reviewer decision CTA takes priority when the
 * caller has a pending procedure_review task and an undecided approver row.
 */
export const ProcedureOwnerCTA: React.FC<Props> = ({ data, currentUserId, autoOpen }) => {
  const { procedure } = data;
  const [modal, setModal] = useState<Modal>(null);
  const [autoActed, setAutoActed] = useState(false);
  const { data: ownership } = useProcedureOwnership(procedure?.id ?? null, currentUserId);

  const status = (procedure?.status ?? '') as string;

  const myApprover = currentUserId
    ? data.approvers.find((r) => r.user_id === currentUserId && r.decision == null)
    : null;
  const canReviewNow = status === 'UNDER_REVIEW' && !!ownership?.isReviewer && !!myApprover;
  const canOwnAction = !!ownership?.isOwner;

  const cta = useMemo<{ text: string; modal: Modal } | null>(() => {
    if (!procedure) return null;
    if (canReviewNow) return { text: 'Review procedure', modal: 'review' };
    if (!canOwnAction) return null;
    switch (status) {
      case 'NOT_STARTED': return { text: 'Start draft', modal: 'start_draft' };
      case 'DRAFT': return { text: 'Submit for review', modal: 'submit_review' };
      case 'REWORK_REQUESTED': return { text: 'Resubmit for review', modal: 'resubmit' };
      default: return null;
    }
  }, [procedure, canReviewNow, canOwnAction, status]);

  useEffect(() => {
    if (!autoOpen || autoActed || !cta) return;
    setModal(cta.modal);
    setAutoActed(true);
  }, [autoOpen, autoActed, cta]);

  if (!procedure || !cta) return null;

  const decidedCount = data.approvers.filter((r) => r.decision != null).length;
  const totalApprovers = data.approvers.length;
  const documentNumber: string | null = procedure.document_number ?? null;
  const procedureTitle: string = procedure.title;

  // Prior rejection context for resubmission (Training pattern).
  const reworkContext = data.activity
    .filter((a) => a.action === 'Rejected procedure')
    .map((a) => ({ reviewerName: a.actor_name, comment: a.comment, at: a.created_at }));

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="h-8 text-[12.5px]" onClick={() => setModal(cta.modal)}>
          {cta.text}
        </Button>
      </div>

      {modal === 'start_draft' && (
        <StartDraftConfirmModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          procedureId={procedure.id}
          procedureTitle={procedureTitle}
          documentNumber={documentNumber}
        />
      )}

      {(modal === 'submit_review' || modal === 'resubmit') && (
        <SubmitForReviewModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          procedureId={procedure.id}
          procedureTitle={procedureTitle}
          documentNumber={documentNumber}
          existingApprovers={data.approvers}
          isResubmit={modal === 'resubmit'}
          reworkContext={modal === 'resubmit' ? reworkContext : undefined}
        />
      )}

      {modal === 'review' && myApprover && (
        <ProcedureReviewDecisionModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          procedureId={procedure.id}
          procedureTitle={procedureTitle}
          documentNumber={documentNumber}
          authorName={data.author?.full_name ?? null}
          decidedCount={decidedCount}
          totalApprovers={totalApprovers}
          approverRowId={myApprover.id}
        />
      )}
    </>
  );
};
