import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import { StandardDeliverableSheet } from './StandardDeliverableSheet';

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
        return (
          <StandardDeliverableSheet
            open={!!selected}
            onOpenChange={(o) => !o && setSelected(null)}
            kind={selected.inspection_type === 'HOLD' ? 'Hold point' : 'Witness point'}
            title={selected.activity_name}
            chipLabel={status}
            chipTone={statusTone(status)}
            fields={[
              { label: 'Type', value: selected.inspection_type },
              { label: 'Witness party', value: m.witness_party || '—' },
              { label: 'Status', value: status },
              { label: m.completed_date ? 'Completed' : 'Planned', value: m.completed_date || m.planned_date || '—' },
            ]}
            notes={null}
          />
        );
      })()}
    </>
  );
};
