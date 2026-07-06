import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import { P2AHandoverPoint, useHandoverPointSystems } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import { StandardDeliverableSheet } from './StandardDeliverableSheet';

const systemChip = (
  status: string | null | undefined,
  pct: number | null | undefined,
): { label: string; tone: ChipTone } => {
  const s = (status || 'NOT_STARTED').toString().toUpperCase();
  if (s === 'RFSU' || s === 'RFO') return { label: s, tone: 'emerald' };
  if (s === 'IN_PROGRESS') return { label: `${Math.round(pct || 0)}%`, tone: 'blue' };
  return { label: 'Not started', tone: 'slate' };
};

const HydrocarbonBadge: React.FC = () => (
  <span
    title="Hydrocarbon service"
    className="inline-flex items-center gap-0.5 flex-none rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-[1px] text-[9.5px] font-bold tracking-wide uppercase"
  >
    <Flame className="w-2.5 h-2.5" />
    HC
  </span>
);

export const StandardSystemsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { systems, isLoading } = useHandoverPointSystems(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading systems…</div>;
  if (!systems.length)
    return <EmptyDeliverable label="No systems linked to this VCR yet." />;

  const chip = selected ? systemChip(selected.completion_status, selected.completion_percentage) : null;

  return (
    <>
      <DeliverableList>
        {systems.map((s: any) => {
          const c = systemChip(s.completion_status, s.completion_percentage);
          const ctxBits: string[] = [];
          if (s.system_id) ctxBits.push(s.system_id);
          if (s.itr_total_count) ctxBits.push(`${s.itr_total_count} ITRs`);
          return (
            <DeliverableRow
              key={s.id}
              name={s.name}
              nameBadge={s.is_hydrocarbon ? <HydrocarbonBadge /> : null}
              context={ctxBits.join(' · ') || null}
              chipLabel={c.label}
              chipTone={c.tone}
              onClick={() => setSelected(s)}
            />
          );
        })}
      </DeliverableList>

      {selected && chip && (
        <StandardDeliverableSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="System"
          title={selected.name}
          subtitle={selected.system_id || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
          fields={[
            { label: 'System ID', value: selected.system_id || null },
            { label: 'Hydrocarbon', value: selected.is_hydrocarbon ? 'Yes — HC service' : 'No' },
            { label: 'Completion status', value: (selected.completion_status || 'NOT_STARTED').replaceAll('_', ' ') },
            { label: 'Completion %', value: `${Math.round(selected.completion_percentage || 0)}%` },
            { label: 'ITR total', value: selected.itr_total_count ?? 0 },
            { label: 'ITR complete', value: selected.itr_complete_count ?? 0 },
            { label: 'Description', value: selected.description || null, full: true },
          ]}
        />
      )}
    </>
  );
};
