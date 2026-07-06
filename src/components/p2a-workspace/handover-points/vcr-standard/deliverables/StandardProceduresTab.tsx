import React from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRProcedureDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, oraStatusChip } from './DeliverableRow';

export const StandardProceduresTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRProcedureDeliverables(handoverPoint.id);
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading procedures…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No procedures planned yet." hint="Add procedures during plan definition." />;

  return (
    <DeliverableList>
      {rows.map((r) => {
        const chip = oraStatusChip(r.ora.ora_status, r.ora.ora_completion_percentage);
        const ctx = [r.procedure_type, r.responsible_person].filter(Boolean).join(' · ');
        return (
          <DeliverableRow key={r.id} name={r.title} context={ctx || null} chipLabel={chip.label} chipTone={chip.tone} />
        );
      })}
    </DeliverableList>
  );
};
