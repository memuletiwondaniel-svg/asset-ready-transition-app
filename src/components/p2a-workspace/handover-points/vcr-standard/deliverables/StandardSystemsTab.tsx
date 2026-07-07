import React, { useState } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import { P2AHandoverPoint, useHandoverPointSystems } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
} from '../../shared/deliverableDrawer';

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
  const pct = Math.round(selected?.completion_percentage || 0);
  const itrTotal = selected?.itr_total_count ?? 0;
  const itrComplete = selected?.itr_complete_count ?? 0;

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
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="System"
          title={selected.name}
          subtitle={selected.system_id || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
        >
          <Section title="Identification">
            <FieldGrid>
              <LabeledField label="System ID" value={selected.system_id ? <span className="font-mono">{selected.system_id}</span> : null} />
              <LabeledField
                label="Service"
                value={
                  selected.is_hydrocarbon ? (
                    <span className="inline-flex items-center gap-1 text-orange-700">
                      <Flame className="w-3.5 h-3.5" /> Hydrocarbon
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-blue-700">
                      <Snowflake className="w-3.5 h-3.5" /> Utility
                    </span>
                  )
                }
              />
              {selected.description && (
                <LabeledField label="Description" value={selected.description} full />
              )}
            </FieldGrid>
          </Section>

          <Section title="Completion">
            <FieldGrid>
              <LabeledField
                label="Status"
                value={<InlineChip tone={chip.tone}>{chip.label}</InlineChip>}
              />
              <LabeledField label="Completion" value={`${pct}%`} />
              <LabeledField label="ITRs complete" value={`${itrComplete} / ${itrTotal}`} />
              <LabeledField
                label="ITR progress"
                value={
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${itrTotal ? (itrComplete / itrTotal) * 100 : 0}%` }}
                    />
                  </div>
                }
              />
            </FieldGrid>
          </Section>
        </DeliverableDetailShell>
      )}
    </>
  );
};
