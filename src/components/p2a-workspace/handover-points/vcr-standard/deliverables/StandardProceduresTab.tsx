import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRProcedureDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, procedureStatusChip } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
  AssaiLink,
  ApprovalLog,
  DrawerDivider,
} from '../../shared/deliverableDrawer';

const isCompleted = (status?: string) => {
  const s = (status || '').toLowerCase();
  return s === 'approved' || s === 'issued';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNewProcedure = (p: any): boolean => {
  const t = (p?.procedure_type || '').toLowerCase();
  // Heuristic until schema exposes a new/update flag
  return t.includes('new') || (p?.change_type === 'new');
};

export const StandardProceduresTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRProcedureDeliverables(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading procedures…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No procedures planned yet." hint="Add procedures during plan definition." />;

  const chip = selected ? procedureStatusChip(selected.status) : null;
  const completed = selected && isCompleted(selected.status);
  const assaiDocNo = selected?.assai_doc_code || selected?.doc_code || null;
  const currentDocStatus = selected?.doc_status || (completed ? 'AFU' : 'Draft');

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const c = procedureStatusChip(r.status);
          const ctx = [r.procedure_type, r.responsible_person].filter(Boolean).join(' · ');
          return (
            <DeliverableRow key={r.id} name={r.title} context={ctx || null} chipLabel={c.label} chipTone={c.tone} onClick={() => setSelected(r)} />
          );
        })}
      </DeliverableList>
      {selected && chip && (
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Procedure"
          title={selected.title}
          subtitle={selected.procedure_type || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
        >
          <Section title="Overview">
            <FieldGrid>
              <LabeledField label="Title" value={selected.title} full />
              <LabeledField label="Type" value={selected.procedure_type || null} />
              <LabeledField
                label="Change"
                value={isNewProcedure(selected) ? 'New procedure' : 'Update to existing'}
              />
              <LabeledField label="Reason" value={selected.description || null} full />
              <LabeledField
                label="Applicable systems"
                value={
                  selected.system_ids?.length
                    ? `${selected.system_ids.length} system${selected.system_ids.length === 1 ? '' : 's'} mapped`
                    : null
                }
              />
              <LabeledField label="Responsible" value={selected.responsible_person || null} />
              <LabeledField
                label="Status"
                value={<InlineChip tone={chip.tone}>{chip.label}</InlineChip>}
              />
              <LabeledField
                label={completed ? 'Delivered' : 'Target date'}
                value={selected.target_date || null}
              />
            </FieldGrid>
          </Section>

          <DrawerDivider />

          <Section title="Document">
            <FieldGrid>
              <LabeledField
                label="Assai Doc No."
                value={assaiDocNo ? <span className="font-mono">{assaiDocNo}</span> : null}
              />
              <LabeledField label="Current status" value={currentDocStatus} />
              <LabeledField label="Assai link" value={<AssaiLink docCode={assaiDocNo} />} />
              <LabeledField
                label="Download"
                value={
                  assaiDocNo ? (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[11px] -ml-2"
                    >
                      <a
                        href={`https://client.assaisoftware.com/documents/${encodeURIComponent(
                          assaiDocNo,
                        )}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-3 h-3" /> Latest revision
                      </a>
                    </Button>
                  ) : null
                }
              />
            </FieldGrid>
          </Section>

          {completed && (
            <>
              <DrawerDivider />
              <Section title="Approval log">
                <ApprovalLog
                  entries={selected.approval_log || null}
                  emptyLabel="Approval log not yet synced from Assai."
                />
              </Section>
            </>
          )}
        </DeliverableDetailShell>
      )}
    </>
  );
};
