import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable } from './DeliverableRow';
import { StandardDeliverableSheet } from './StandardDeliverableSheet';

export const StandardMaintenanceTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vcr-maintenance-deliverables', handoverPoint.id],
    enabled: !!handoverPoint.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: rows, error } = await client
        .from('p2a_vcr_maintenance_deliverables')
        .select('id, deliverable_type, is_applicable, comments')
        .eq('handover_point_id', handoverPoint.id)
        .eq('is_applicable', true);
      if (error) throw error;
      return rows || [];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading maintenance systems…</div>;
  const rows = data || [];
  if (!rows.length)
    return (
      <EmptyDeliverable
        label="No maintenance-system deliverables marked applicable yet."
        hint="ARB, PMs, spares and criticality items are flagged during plan definition."
      />
    );

  return (
    <>
      <DeliverableList>
        {rows.map((r: any) => (
          <DeliverableRow
            key={r.id}
            name={r.deliverable_type}
            context={r.comments || null}
            chipLabel="Applicable"
            chipTone="blue"
            onClick={() => setSelected(r)}
          />
        ))}
      </DeliverableList>
      {selected && (
        <StandardDeliverableSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Maintenance system"
          title={selected.deliverable_type}
          chipLabel="Applicable"
          chipTone="blue"
          fields={[
            { label: 'Applicable', value: selected.is_applicable ? 'Yes' : 'No' },
          ]}
          notes={selected.comments || null}
        />
      )}
    </>
  );
};
