import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
} from '../../shared/deliverableDrawer';

interface ITPRow {
  id: string;
  activity_name: string;
  inspection_type: 'WITNESS' | 'HOLD' | string;
  notes: string | null;
  system_id: string | null;
}

interface WHMeta {
  witness_party?: string;
  status?: string;
  planned_date?: string;
  completed_date?: string;
  system_name?: string;
}

const parseMeta = (notes: string | null): WHMeta => {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return { status: notes }; }
};

const statusTone = (status?: string): ChipTone => {
  const s = (status || '').toLowerCase();
  if (s.includes('complete')) return 'emerald';
  if (s.includes('progress')) return 'blue';
  if (s.includes('schedul')) return 'amber';
  return 'slate';
};

const typeTone = (type: string): ChipTone => (type === 'HOLD' ? 'red' : 'blue');

export const StandardWitnessHoldsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vcr-itp-activities', handoverPoint.id],
    enabled: !!handoverPoint.id,
    queryFn: async (): Promise<ITPRow[]> => {
      const { data: rows, error } = await (supabase as any)
        .from('p2a_itp_activities')
        .select('id, activity_name, inspection_type, notes, system_id')
        .eq('handover_point_id', handoverPoint.id)
        .order('display_order');
      if (error) throw error;
      return rows || [];
    },
  });

  const [selected, setSelected] = useState<ITPRow | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading witness &amp; hold points…</div>;
  const rows = data || [];
  if (!rows.length)
    return (
      <EmptyDeliverable
        label="No witness or hold points recorded yet."
        hint="Populates from OWL 3.1 (INT-1) once outstanding-work integration goes live."
      />
    );

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const m = parseMeta(r.notes);
          const status = m.status || (r.inspection_type === 'HOLD' ? 'Pending' : 'Scheduled');
          return (
            <DeliverableRow
              key={r.id}
              name={r.activity_name}
              context={`${r.inspection_type === 'HOLD' ? 'Hold point' : 'Witness point'} · ${m.witness_party || '—'}`}
              chipLabel={status}
              chipTone={statusTone(status)}
              onClick={() => setSelected(r)}
            />
          );
        })}
      </DeliverableList>
      {selected && (() => {
        const m = parseMeta(selected.notes);
        const status = m.status || (selected.inspection_type === 'HOLD' ? 'Pending' : 'Scheduled');
        const typeLabel = selected.inspection_type === 'HOLD' ? 'Hold' : 'Witness';
        return (
          <DeliverableDetailShell
            open={!!selected}
            onOpenChange={(o) => !o && setSelected(null)}
            kind={`${typeLabel} point`}
            title={selected.activity_name}
            subtitle={m.system_name || selected.system_id || null}
            chipLabel={status}
            chipTone={statusTone(status)}
          >
            <Section>
              <FieldGrid>
                <LabeledField
                  label="System"
                  value={m.system_name || selected.system_id || null}
                />
                <LabeledField label="Activity" value={selected.activity_name} />
                <LabeledField
                  label="Type"
                  value={<InlineChip tone={typeTone(selected.inspection_type)}>{typeLabel}</InlineChip>}
                />
                <LabeledField
                  label="Status"
                  value={<InlineChip tone={statusTone(status)}>{status}</InlineChip>}
                />
                <LabeledField label="Witness party" value={m.witness_party || null} full />
                <LabeledField
                  label={m.completed_date ? 'Completed' : 'Planned'}
                  value={m.completed_date || m.planned_date || null}
                />
              </FieldGrid>
            </Section>
            {(() => {
              // Notes may be plain string when meta parse fell through
              const rawNotes = (() => {
                if (!selected.notes) return null;
                try { JSON.parse(selected.notes); return null; } catch { return selected.notes; }
              })();
              return rawNotes ? (
                <Section title="Notes">
                  <div className="text-[12.5px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {rawNotes}
                  </div>
                </Section>
              ) : null;
            })()}
          </DeliverableDetailShell>
        );
      })()}
    </>
  );
};
