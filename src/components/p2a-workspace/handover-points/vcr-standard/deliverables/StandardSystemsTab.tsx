import React from 'react';
import { P2AHandoverPoint, useHandoverPointSystems } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';

const systemChip = (
  status: string | null | undefined,
  pct: number | null | undefined,
): { label: string; tone: ChipTone } => {
  const s = (status || 'NOT_STARTED').toString().toUpperCase();
  if (s === 'RFSU' || s === 'RFO') return { label: s, tone: 'emerald' };
  if (s === 'IN_PROGRESS') return { label: `${Math.round(pct || 0)}%`, tone: 'blue' };
  return { label: 'Not started', tone: 'slate' };
};

export const StandardSystemsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { systems, isLoading } = useHandoverPointSystems(handoverPoint.id);
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading systems…</div>;
  if (!systems.length)
    return <EmptyDeliverable label="No systems linked to this VCR yet." />;

  return (
    <DeliverableList>
      {systems.map((s: any) => {
        const chip = systemChip(s.completion_status, s.completion_percentage);
        const ctxBits: string[] = [];
        if (s.system_id) ctxBits.push(s.system_id);
        if (s.is_hydrocarbon) ctxBits.push('Hydrocarbon');
        if (s.itr_total_count) ctxBits.push(`${s.itr_total_count} ITRs`);
        return (
          <DeliverableRow
            key={s.id}
            name={s.name}
            context={ctxBits.join(' · ') || null}
            chipLabel={chip.label}
            chipTone={chip.tone}
          />
        );
      })}
    </DeliverableList>
  );
};
