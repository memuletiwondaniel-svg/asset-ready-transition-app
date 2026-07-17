import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTrainingOwnership } from './useTrainingOwnership';
import type { TrainingLifecycleData } from './useTrainingLifecycle';
import { RequestPOModal } from './modals/RequestPOModal';
import { ProvidePOModal } from './modals/ProvidePOModal';
import { UploadMaterialsModal } from './modals/UploadMaterialsModal';
import { ProvideAttendanceModal } from './modals/ProvideAttendanceModal';
import { ScheduleTrainingModal } from './modals/ScheduleTrainingModal';
import { CompleteTrainingModal } from './modals/CompleteTrainingModal';

type Modal =
  | 'request_po'
  | 'provide_po'
  | 'upload_materials'
  | 'provide_attendance'
  | 'schedule'
  | 'complete'
  | null;

interface Props {
  data: TrainingLifecycleData;
  currentUserId: string | null;
}

/**
 * Owner-only footer CTA for the Training drawer. Visibility is gated by an
 * open user_tasks row for the caller (mirrors the DB-side gate). One CTA
 * per state — the reviewer decision CTA is separate (FE-4).
 */
export const TrainingOwnerCTA: React.FC<Props> = ({ data, currentUserId }) => {
  const { training } = data;
  const [modal, setModal] = useState<Modal>(null);
  const { data: ownership } = useTrainingOwnership(training?.id ?? null, currentUserId);

  if (!training) return null;
  if (!ownership?.isOwner) return null;

  const status = training.status as string;
  const label = training.title as string;
  const provider = training.training_provider ?? null;

  const cta = (() => {
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
    </>
  );
};
