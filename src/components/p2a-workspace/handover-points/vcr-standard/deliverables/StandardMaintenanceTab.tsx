import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';

const cmmsChip = (
  status: string | null | undefined,
  pct: number | null | undefined,
): { label: string; tone: ChipTone } => {
  const s = (status || 'NOT_STARTED').toString().toUpperCase();
  if (s === 'COMPLETED') return { label: 'Complete', tone: 'emerald' };
  if (s === 'IN_PROGRESS') return { label: `${Math.round(pct || 0)}%`, tone: 'blue' };
  return { label: 'To deliver', tone: 'slate' };
};

/**
 * Maintenance-systems deliverables (ARB / PMs / spares / criticality etc.)
 * source from p2a_vcr_maintenance_deliverables. Real rows only.
 */
export const StandardMaintenanceTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vcr-maintenance-deliverables', handoverPoint.id],
    enabled: !!handoverPoint.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: rows, error } = await client
        .from('p2a_vcr_maintenance_deliverables')
        .select('id, component_code, component_name, status, completion_percentage, target_date')
        .eq('handover_point_id', handoverPoint.id)
        .order('display_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return rows || [];
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading maintenance systems…</div>;
  const rows = data || [];
  if (!rows.length)
    return <EmptyDeliverable label="No maintenance-system deliverables configured yet." hint="ARB, PMs, spares and criticality items are added during plan definition." />;

  return (
    <DeliverableList>
      {rows.map((r: any) => {
        const chip = cmmsChip(r.status, r.completion_percentage);
        return (
          <DeliverableRow
            key={r.id}
            name={r.component_name || r.component_code || 'Unnamed'}
            context={r.component_code || null}
            chipLabel={chip.label}
            chipTone={chip.tone}
          />
        );
      })}
    </DeliverableList>
  );
};
