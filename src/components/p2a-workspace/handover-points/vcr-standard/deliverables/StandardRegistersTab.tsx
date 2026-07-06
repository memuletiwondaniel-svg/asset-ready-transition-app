import React from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRRegisterDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, oraStatusChip } from './DeliverableRow';

export const StandardRegistersTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRRegisterDeliverables(handoverPoint.id);
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading registers…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No registers or logsheets configured yet." hint="Register selections are made during plan definition." />;

  return (
    <DeliverableList>
      {rows.map((r) => {
        const chip = oraStatusChip(r.ora.ora_status, r.ora.ora_completion_percentage);
        const ctx = r.responsible_person || null;
        return (
          <DeliverableRow key={r.id} name={r.title} context={ctx} chipLabel={chip.label} chipTone={chip.tone} />
        );
      })}
    </DeliverableList>
  );
};
