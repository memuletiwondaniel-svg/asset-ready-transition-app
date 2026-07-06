import React, { useState } from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRTrainingDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, oraStatusChip } from './DeliverableRow';
import { StandardDeliverableSheet } from './StandardDeliverableSheet';

export const StandardTrainingTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRTrainingDeliverables(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading training…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No training deliverables planned yet." hint="Add training items during plan definition." />;

  const chip = selected ? oraStatusChip(selected.ora?.ora_status, selected.ora?.ora_completion_percentage) : null;

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const c = oraStatusChip(r.ora.ora_status, r.ora.ora_completion_percentage);
          const ctx = [r.training_provider, r.duration_hours ? `${r.duration_hours} h` : null].filter(Boolean).join(' · ');
          return (
            <DeliverableRow key={r.id} name={r.title} context={ctx || null} chipLabel={c.label} chipTone={c.tone} onClick={() => setSelected(r)} />
          );
        })}
      </DeliverableList>
      {selected && chip && (
        <StandardDeliverableSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Training"
          title={selected.title}
          subtitle={selected.training_provider || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
          fields={[
            { label: 'Provider', value: selected.training_provider || null },
            { label: 'Duration', value: selected.duration_hours ? `${selected.duration_hours} h` : null },
            { label: 'Responsible', value: selected.responsible_person || null },
            { label: 'ORA status', value: (selected.ora?.ora_status || 'NOT_STARTED').replaceAll('_', ' ') },
            { label: 'ORA %', value: `${Math.round(selected.ora?.ora_completion_percentage || 0)}%` },
            { label: 'Description', value: selected.description || null, full: true },
          ]}
        />
      )}
    </>
  );
};
