import React from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRTrainingDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, oraStatusChip } from './DeliverableRow';

export const StandardTrainingTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRTrainingDeliverables(handoverPoint.id);
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading training…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No training deliverables planned yet." hint="Add training items during plan definition." />;

  return (
    <DeliverableList>
      {rows.map((r) => {
        const chip = oraStatusChip(r.ora.ora_status, r.ora.ora_completion_percentage);
        const ctx = [r.training_provider, r.duration_hours ? `${r.duration_hours} h` : null].filter(Boolean).join(' · ');
        return (
          <DeliverableRow key={r.id} name={r.title} context={ctx || null} chipLabel={chip.label} chipTone={chip.tone} />
        );
      })}
    </DeliverableList>
  );
};
