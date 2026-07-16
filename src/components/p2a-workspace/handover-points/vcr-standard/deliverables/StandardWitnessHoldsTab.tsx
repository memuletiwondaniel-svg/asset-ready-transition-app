import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import {
  DeliverableList,
  DeliverableRow,
  EmptyDeliverable,
  ChipTone,
} from './DeliverableRow';
import {
  useWHPoints,
  WHPoint,
  WH_STATUS_PRESENTATION,
  sortByStatusBucket,
  typeLabel,
} from './useWHPoints';
import { WitnessHoldDrawer } from './WitnessHoldDrawer';
import { AddWitnessHoldPointModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/AddWitnessHoldPointModal';
import { ScheduleWitnessHoldModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/ScheduleWitnessHoldModal';
import { CompleteWitnessHoldModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/CompleteWitnessHoldModal';
import { ReviewWitnessHoldModal } from '@/components/widgets/vcr-wizard/steps/witness-hold/ReviewWitnessHoldModal';
import { useProjectRoleHolders } from '@/hooks/useProjectRoleHolders';

/**
 * FE-1 + FE-2: Witness & Hold tab.
 * Bucket order REWORK_REQUESTED → UNDER_REVIEW → NOT_STARTED → SCHEDULED → COMPLETED.
 * Wires the 3 workflow modals (Schedule / Complete / Review & Approve) via the drawer footer CTA.
 */
export const StandardWitnessHoldsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({
  handoverPoint,
}) => {
  const { data, isLoading } = useWHPoints(handoverPoint.id);
  const [selected, setSelected] = useState<WHPoint | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<WHPoint | null>(null);
  const [completeFor, setCompleteFor] = useState<WHPoint | null>(null);
  const [reviewFor, setReviewFor] = useState<WHPoint | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUid(data.user?.id ?? null));
  }, []);

  const points = data?.points ?? [];
  const projectId = data?.projectId ?? null;

  const sorted = useMemo(() => [...points].sort(sortByStatusBucket), [points]);

  // Refresh `selected` from server-fresh points so status-transitioning modals
  // update the drawer footer without closing/re-opening.
  useEffect(() => {
    if (!selected) return;
    const fresh = points.find((p) => p.id === selected.id) || null;
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [points, selected]);

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading witness &amp; hold points…
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <EmptyDeliverable
        label="No witness or hold points recorded yet."
        hint="Add points from the VCR plan Inspection &amp; Test Plan step."
      />
    );
  }

  return (
    <>
      <DeliverableList>
        {sorted.map((p) => {
          const pres = WH_STATUS_PRESENTATION[p.status];
          const contextParts = [
            typeLabel(p.inspection_type),
            p.system ? `${p.system.system_id} · ${p.system.name}` : null,
          ].filter(Boolean);
          return (
            <DeliverableRow
              key={p.id}
              name={p.activity_name}
              context={contextParts.join(' · ')}
              chipLabel={pres.label}
              chipTone={pres.tone as ChipTone}
              onClick={() => setSelected(p)}
            />
          );
        })}
      </DeliverableList>

      <WitnessHoldDrawer
        point={selected}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        projectId={projectId}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSchedule={(p) => setScheduleFor(p)}
        onComplete={(p) => setCompleteFor(p)}
        onReview={(p) => setReviewFor(p)}
        onEditParties={(p) => setEditingId(p.id)}
      />

      {editingId && (
        <AddWitnessHoldPointModal
          vcrId={handoverPoint.id}
          projectId={projectId}
          open={!!editingId}
          onOpenChange={(o) => !o && setEditingId(null)}
          editingActivityId={editingId}
          onUpdated={() => setEditingId(null)}
          onClose={() => setEditingId(null)}
        />
      )}

      {scheduleFor && (
        <ScheduleWitnessHoldModal
          point={scheduleFor}
          vcrCode={handoverPoint.vcr_code}
          vcrName={handoverPoint.name}
          projectId={projectId}
          open
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
          currentUserId={currentUid}
          deliveringPartyLabel={reviewFor.delivering_party_role_name || 'delivering party'}
          open={!!reviewFor}
          onOpenChange={(o) => !o && setReviewFor(null)}
        />
      )}
    </>
  );
};

