import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTrainingOwnership } from './useTrainingOwnership';
import type { TrainingLifecycleData } from './useTrainingLifecycle';
import { RequestPOModal } from './modals/RequestPOModal';
import { ProvidePOModal } from './modals/ProvidePOModal';
import { UploadMaterialsModal } from './modals/UploadMaterialsModal';
import { ProvideAttendanceModal } from './modals/ProvideAttendanceModal';
import { ScheduleTrainingModal } from './modals/ScheduleTrainingModal';
import { CompleteTrainingModal } from './modals/CompleteTrainingModal';
import { ReviewDecisionModal } from './modals/ReviewDecisionModal';

type Modal =
  | 'request_po'
  | 'provide_po'
  | 'upload_materials'
  | 'provide_attendance'
  | 'schedule'
  | 'complete'
  | 'review'
  | null;

interface Props {
  data: TrainingLifecycleData;
  currentUserId: string | null;
  /** When true, auto-opens the appropriate modal for the current user (used by task launcher). */
  autoOpen?: boolean;
}

/**
 * Owner/reviewer footer CTA for the Training drawer. Visibility is gated by
 * an open user_tasks row for the caller (mirrors the DB-side gate). One CTA
 * per state — reviewer decision CTA is prioritised when applicable.
 */
export const TrainingOwnerCTA: React.FC<Props> = ({ data, currentUserId, autoOpen }) => {
  const { training } = data;
  const [modal, setModal] = useState<Modal>(null);
  const [autoActed, setAutoActed] = useState(false);
  const { data: ownership } = useTrainingOwnership(training?.id ?? null, currentUserId);

  if (!training) return null;

  const status = training.status as string;
  const label = training.title as string;
  const provider = training.training_provider ?? null;

  const decidedCount = data.reviewers.filter((r) => r.decision != null).length;
  const totalReviewers = data.reviewers.length;

  // Reviewer branch takes priority — a reviewer viewing a MATERIALS_UNDER_REVIEW
  // row with an undecided reviewer_row for them gets the decision CTA.
  const myReviewer = currentUserId
    ? data.reviewers.find((r) => r.user_id === currentUserId && r.decision == null)
    : null;
  const canReviewNow = status === 'MATERIALS_UNDER_REVIEW' && !!ownership?.isReviewer && !!myReviewer;

  if (!ownership?.isOwner && !canReviewNow) return null;

  const cta = (() => {
    if (canReviewNow) {
      return { text: 'Review materials', modal: 'review' as Modal };
    }
    switch (status) {
      case 'NOT_STARTED':
        return { text: 'Request PO', modal: 'request_po' as Modal };
      case 'AWAITING_PO':
        return { text: 'Provide PO', modal: 'provide_po' as Modal };
      case 'AWAITING_MATERIALS':
        return { text: 'Upload materials', modal: 'upload_materials' as Modal };
      case 'AWAITING_ATTENDANCE_LIST':
        return { text: 'Provide attendance list', modal: 'provide_attendance' as Modal };
      case 'READY_TO_SCHEDULE':
        return { text: 'Schedule training', modal: 'schedule' as Modal };
      case 'SCHEDULED':
        return { text: 'Mark complete', modal: 'complete' as Modal };
      default:
        return null;
    }
  })();

  // Auto-open the CTA modal once when launched from a task.
  useEffect(() => {
    if (!autoOpen || autoActed || !cta) return;
    setModal(cta.modal);
    setAutoActed(true);
  }, [autoOpen, autoActed, cta]);

  if (!cta) return null;

  const hasPriorReview = data.activity.some(
    (a) => a.from_status === 'MATERIALS_UNDER_REVIEW' && a.to_status === 'AWAITING_MATERIALS',
  );

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="h-8 text-[12.5px]" onClick={() => setModal(cta.modal)}>
          {cta.text}
        </Button>
      </div>

      {modal === 'request_po' && (
        <RequestPOModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
        />
      )}
      {modal === 'provide_po' && (
        <ProvidePOModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
        />
      )}
      {modal === 'upload_materials' && (
        <UploadMaterialsModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
          existingReviewers={data.reviewers}
          activity={data.activity}
          isResubmit={hasPriorReview}
        />
      )}
      {modal === 'provide_attendance' && (
        <ProvideAttendanceModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
        />
      )}
      {modal === 'schedule' && (
        <ScheduleTrainingModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
          attachments={data.attachments}
        />
      )}
      {modal === 'complete' && (
        <CompleteTrainingModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
        />
      )}
      {modal === 'review' && myReviewer && (
        <ReviewDecisionModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          trainingId={training.id}
          trainingTitle={label}
          provider={provider}
          decidedCount={decidedCount}
          totalReviewers={totalReviewers}
          reviewerRowId={myReviewer.id}
        />
      )}
    </>
  );
};
