import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRRegisterDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, oraStatusChip } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
  ApprovalLog,
  DrawerDivider,
} from '../../shared/deliverableDrawer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registerStatusLabel = (r: any): string => {
  const s = (r?.ora?.ora_status || 'NOT_STARTED').toString().toUpperCase();
  if (s === 'COMPLETED') return r?.approval_status || 'Approved';
  if (s === 'IN_PROGRESS') return 'Updated';
  return 'Not started';
};

export const StandardRegistersTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRRegisterDeliverables(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading registers…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No registers or logsheets configured yet." hint="Register selections are made during plan definition." />;

  const chip = selected ? oraStatusChip(selected.ora?.ora_status, selected.ora?.ora_completion_percentage) : null;
  const completed = selected?.ora?.ora_status === 'COMPLETED';

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const c = oraStatusChip(r.ora.ora_status, r.ora.ora_completion_percentage);
          return (
            <DeliverableRow key={r.id} name={r.title} context={r.responsible_person || null} chipLabel={c.label} chipTone={c.tone} onClick={() => setSelected(r)} />
          );
        })}
      </DeliverableList>
      {selected && chip && (
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Register / Logsheet"
          title={selected.title}
          subtitle={selected.responsible_person || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
        >
          <Section title="Register">
            <FieldGrid>
              <LabeledField label="Title" value={selected.title} full />
              <LabeledField label="Description" value={selected.description || null} full />
              <LabeledField label="Responsible" value={selected.responsible_person || null} />
              <LabeledField
                label="Status"
                value={<InlineChip tone={chip.tone}>{registerStatusLabel(selected)}</InlineChip>}
              />
              <LabeledField
                label="ORA %"
                value={`${Math.round(selected.ora?.ora_completion_percentage || 0)}%`}
              />
              <LabeledField
                label={completed ? 'Completed' : 'Target date'}
                value={selected.target_date || null}
              />
            </FieldGrid>
          </Section>

          {completed && (
            <>
              <DrawerDivider />
              <Section title="Completed copy">
                {selected.completed_copy_url ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-[12px]"
                  >
                    <a href={selected.completed_copy_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5" /> Download completed register
                    </a>
                  </Button>
                ) : (
                  <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-[12px] text-muted-foreground text-center">
                    Completed copy not yet uploaded.
                  </div>
                )}
              </Section>
              <DrawerDivider />
              <Section title="Approval history">
                <ApprovalLog
                  entries={selected.approval_log || null}
                  emptyLabel="No approvals recorded yet."
                />
              </Section>
            </>
          )}
        </DeliverableDetailShell>
      )}
    </>
  );
};
