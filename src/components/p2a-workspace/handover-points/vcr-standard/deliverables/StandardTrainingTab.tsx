import React, { useState } from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRTrainingDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, trainingStatusChip } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
  TagList,
  EvidenceList,
  DrawerDivider,
} from '../../shared/deliverableDrawer';

const isCompleted = (status?: string) => {
  const s = (status || '').toLowerCase();
  return s === 'delivered' || s === 'competency_verified';
};

export const StandardTrainingTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRTrainingDeliverables(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading training…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No training deliverables planned yet." hint="Add training items during plan definition." />;

  const chip = selected ? trainingStatusChip(selected.status) : null;
  const completed = selected && isCompleted(selected.status);

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const c = trainingStatusChip(r.status);
          const ctx = [r.training_provider, r.duration_hours ? `${r.duration_hours} h` : null].filter(Boolean).join(' · ');
          return (
            <DeliverableRow key={r.id} name={r.title} context={ctx || null} chipLabel={c.label} chipTone={c.tone} onClick={() => setSelected(r)} />
          );
        })}
      </DeliverableList>
      {selected && chip && (
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Training"
          title={selected.title}
          subtitle={selected.training_provider || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
        >
          <Section title="Overview">
            <FieldGrid>
              <LabeledField label="Title" value={selected.title} full />
              <LabeledField
                label="Objective & justification"
                value={selected.description || null}
                full
              />
              <LabeledField label="Provider" value={selected.training_provider || null} />
              <LabeledField
                label="Delivery format"
                value={<TagList items={selected.delivery_method} />}
              />
              <LabeledField
                label="Target audience"
                value={<TagList items={selected.target_audience} />}
                full
              />
              <LabeledField
                label="Applicable systems"
                value={
                  selected.system_ids?.length
                    ? `${selected.system_ids.length} system${selected.system_ids.length === 1 ? '' : 's'} mapped`
                    : null
                }
              />
              <LabeledField
                label="Duration"
                value={selected.duration_hours ? `${selected.duration_hours} h` : null}
              />
              <LabeledField
                label="Status"
                value={<InlineChip tone={chip.tone}>{chip.label}</InlineChip>}
              />
              <LabeledField
                label={completed ? 'Delivered' : 'Tentative date'}
                value={selected.tentative_date || null}
              />
            </FieldGrid>
          </Section>

          {completed && (
            <>
              <DrawerDivider />
              <Section title="Supporting evidence">
                <EvidenceList
                  items={selected.evidence || null}
                  emptyLabel="Attendance, materials & photos not yet uploaded."
                />
              </Section>
            </>
          )}
        </DeliverableDetailShell>
      )}
    </>
  );
};
