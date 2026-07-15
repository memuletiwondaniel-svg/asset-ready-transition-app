import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
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

/**
 * FE-1: Witness & Hold tab on the VCR handover point.
 * Bucket order: REWORK_REQUESTED → UNDER_REVIEW → NOT_STARTED → SCHEDULED → COMPLETED.
 * Sentence-case status pills, real system label (system_id · name), no uuid subtext.
 */
export const StandardWitnessHoldsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({
  handoverPoint,
}) => {
  const { data, isLoading } = useWHPoints(handoverPoint.id);
  const [selected, setSelected] = useState<WHPoint | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const points = data?.points ?? [];
  const projectId = data?.projectId ?? null;

  const sorted = useMemo(() => [...points].sort(sortByStatusBucket), [points]);

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
        onSchedule={() =>
          toast.info('Schedule modal ships in FE-2.', { description: 'Coming next sub-turn.' })
        }
        onComplete={() =>
          toast.info('Complete modal ships in FE-2.', { description: 'Coming next sub-turn.' })
        }
        onReview={() =>
          toast.info('Review & Approve modal ships in FE-2.', { description: 'Coming next sub-turn.' })
        }
        onEditParties={(p) => setEditingId(p.id)}
      />

      {editingId && (
        <AddWitnessHoldPointModal
          vcrId={handoverPoint.id}
          open={!!editingId}
          onOpenChange={(o) => !o && setEditingId(null)}
          editingActivityId={editingId}
          onUpdated={() => setEditingId(null)}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
};
