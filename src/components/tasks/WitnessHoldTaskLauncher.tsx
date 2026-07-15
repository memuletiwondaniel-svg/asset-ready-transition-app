import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  useWHPoints,
  WHPoint,
} from '@/components/p2a-workspace/handover-points/vcr-standard/deliverables/useWHPoints';
import { WitnessHoldDrawer } from '@/components/p2a-workspace/handover-points/vcr-standard/deliverables/WitnessHoldDrawer';
import { ScheduleWitnessHoldModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/ScheduleWitnessHoldModal';
import { CompleteWitnessHoldModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/CompleteWitnessHoldModal';
import { ReviewWitnessHoldModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/ReviewWitnessHoldModal';

/**
 * FE-3: launcher that opens the Witness & Hold drawer from a kanban task.
 *
 *  - wh_delivery_bundle  → opens the drawer on the first non-COMPLETED activity
 *                          belonging to this delivering-party bundle. Auto-opens
 *                          the Complete modal if the activity is SCHEDULED or
 *                          REWORK_REQUESTED.
 *  - wh_review           → opens the drawer for the specific itp_activity_id and
 *                          auto-opens the Review & Approve modal if the current
 *                          user still has a PENDING accepting row.
 */
export interface WitnessHoldTaskLauncherProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  taskType: 'wh_delivery_bundle' | 'wh_review';
  handoverPointId: string;
  itpActivityId?: string;
  deliveringPartyRoleId?: string;
  subItemActivityIds?: string[];
  vcrCode: string;
  vcrName: string;
}

export const WitnessHoldTaskLauncher: React.FC<WitnessHoldTaskLauncherProps> = ({
  open, onOpenChange, taskType,
  handoverPointId, itpActivityId, deliveringPartyRoleId, subItemActivityIds,
  vcrCode, vcrName,
}) => {
  const { data, isLoading } = useWHPoints(open ? handoverPointId : undefined);
  const [uid, setUid] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<WHPoint | null>(null);
  const [completeFor, setCompleteFor] = useState<WHPoint | null>(null);
  const [reviewFor, setReviewFor] = useState<WHPoint | null>(null);
  const [autoActed, setAutoActed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  useEffect(() => { if (!open) setAutoActed(false); }, [open]);

  const points = data?.points ?? [];
  const projectId = data?.projectId ?? null;

  const target = useMemo<WHPoint | null>(() => {
    if (!points.length) return null;
    if (taskType === 'wh_review' && itpActivityId) {
      return points.find((p) => p.id === itpActivityId) ?? null;
    }
    // wh_delivery_bundle: prefer the first non-COMPLETED activity in the bundle
    const inBundle = (p: WHPoint) =>
      (!deliveringPartyRoleId || p.delivering_party_role_id === deliveringPartyRoleId) &&
      (!subItemActivityIds?.length || subItemActivityIds.includes(p.id));
    const scoped = points.filter(inBundle);
    return (
      scoped.find((p) => p.status === 'SCHEDULED' || p.status === 'REWORK_REQUESTED') ||
      scoped.find((p) => p.status !== 'COMPLETED') ||
      scoped[0] ||
      null
    );
  }, [points, taskType, itpActivityId, deliveringPartyRoleId, subItemActivityIds]);

  // Auto-open the workflow modal once, after the target resolves.
  useEffect(() => {
    if (autoActed || !open || !target || isLoading) return;
    if (taskType === 'wh_review') {
      const mine = target.accepting_parties.find(
        (p) => p.user_id === uid && p.status === 'PENDING',
      );
      if (mine) { setReviewFor(target); setAutoActed(true); }
    } else {
      if (target.status === 'SCHEDULED' || target.status === 'REWORK_REQUESTED') {
        setCompleteFor(target); setAutoActed(true);
      }
    }
  }, [autoActed, open, target, isLoading, taskType, uid]);

  // Keep modal state pointing at the fresh copy after mutations.
  useEffect(() => {
    if (completeFor) {
      const fresh = points.find((p) => p.id === completeFor.id);
      if (fresh && fresh !== completeFor) setCompleteFor(fresh);
    }
    if (reviewFor) {
      const fresh = points.find((p) => p.id === reviewFor.id);
      if (fresh && fresh !== reviewFor) setReviewFor(fresh);
    }
    if (scheduleFor) {
      const fresh = points.find((p) => p.id === scheduleFor.id);
      if (fresh && fresh !== scheduleFor) setScheduleFor(fresh);
    }
  }, [points, completeFor, reviewFor, scheduleFor]);

  return (
    <>
      <WitnessHoldDrawer
        point={target}
        vcrCode={vcrCode}
        vcrName={vcrName}
        projectId={projectId}
        open={open && !!target}
        onOpenChange={onOpenChange}
        onSchedule={(p) => setScheduleFor(p)}
        onComplete={(p) => setCompleteFor(p)}
        onReview={(p) => setReviewFor(p)}
      />

      {scheduleFor && (
        <ScheduleWitnessHoldModal
          point={scheduleFor}
          vcrCode={vcrCode}
          vcrName={vcrName}
          open={!!scheduleFor}
          onOpenChange={(o) => !o && setScheduleFor(null)}
        />
      )}
      {completeFor && (
        <CompleteWitnessHoldModal
          point={completeFor}
          open={!!completeFor}
          onOpenChange={(o) => !o && setCompleteFor(null)}
        />
      )}
      {reviewFor && (
        <ReviewWitnessHoldModal
          point={reviewFor}
          currentUserId={uid}
          deliveringPartyLabel={reviewFor.delivering_party_role_name || 'Delivering party'}
          open={!!reviewFor}
          onOpenChange={(o) => !o && setReviewFor(null)}
        />
      )}
    </>
  );
};
