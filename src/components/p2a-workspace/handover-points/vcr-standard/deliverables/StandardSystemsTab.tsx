import React, { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { P2AHandoverPoint, useHandoverPointSystems } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import { SystemDrawer } from './SystemDrawer';
import { computeSystemMilestone } from './useSystemDetail';

const HydrocarbonBadge: React.FC = () => (
  <span
    title="Hydrocarbon service"
    className="inline-flex items-center gap-0.5 flex-none rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-[1px] text-[9.5px] font-bold tracking-wide uppercase"
  >
    <Flame className="w-2.5 h-2.5" />
    HC
  </span>
);

const bucketOrder = (label: string): number => {
  // G4: most-at-risk first (in-progress ascending by %), terminal (RFO/RFSU) at bottom.
  // Ordering handled at row level via pct then via label.
  if (label === 'RFSU' || label === 'RFO') return 3;
  if (label === 'MC' || label === 'RFC') return 2;
  return 1;
};

export const StandardSystemsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { systems, isLoading } = useHandoverPointSystems(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  const sorted = useMemo(() => {
    const rows = [...(systems as any[])].map((s) => {
      const milestone = computeSystemMilestone(s.completion_status, s.is_hydrocarbon, []);
      const pct = s.completion_percentage ?? 0;
      return { s, milestone, pct };
    });
    rows.sort((a, b) => {
      const ba = bucketOrder(a.milestone.label);
      const bb = bucketOrder(b.milestone.label);
      if (ba !== bb) return ba - bb;
      // In-progress: ascending by % (most at-risk first)
      if (ba < 3) return a.pct - b.pct;
      // Terminal: keep stable
      return a.s.name.localeCompare(b.s.name);
    });
    return rows;
  }, [systems]);

  const narrative = useMemo(() => {
    if (!systems.length) return null;
    const total = systems.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const complete = (systems as any[]).filter((s) => s.completion_status === 'RFO' || s.completion_status === 'RFSU').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notStarted = (systems as any[]).filter((s) => s.completion_status === 'NOT_STARTED').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inProgress = total - complete - notStarted;
    return { total, complete, notStarted, inProgress };
  }, [systems]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading systems…</div>;

  return (
    <div>
      {/* G2 header */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-[15px] font-bold tracking-tight">Systems</h2>
        <div className="text-[11.5px] text-muted-foreground mt-0.5">
          {handoverPoint.vcr_code}{handoverPoint.name ? ` · ${handoverPoint.name}` : ''}
        </div>
      </div>
      <div className="border-t" />
      {narrative && (
        <div className="mx-4 my-3 rounded-md bg-muted/40 px-3 py-2.5 text-[12px] leading-relaxed text-foreground">
          <span className="font-semibold">{narrative.complete} of {narrative.total} systems</span> have reached their handover milestone.
          {narrative.inProgress > 0 && <> {narrative.inProgress} are in progress.</>}
          {narrative.notStarted > 0 && <> {narrative.notStarted} have not started.</>}
        </div>
      )}
      <div className="border-t" />

      {!systems.length ? (
        <EmptyDeliverable label="No systems linked to this VCR yet." />
      ) : (
        <DeliverableList>
          {sorted.map(({ s, milestone, pct }) => {
            const ctxBits: string[] = [];
            if (s.system_id) ctxBits.push(s.system_id);
            if (s.itr_total_count) ctxBits.push(`${s.itr_total_count} ITRs`);
            if (milestone.label === 'Not started' || bucketOrder(milestone.label) === 1) {
              ctxBits.push(`${pct}%`);
            }
            return (
              <DeliverableRow
                key={s.id}
                name={s.name}
                nameBadge={s.is_hydrocarbon ? <HydrocarbonBadge /> : null}
                context={ctxBits.join(' · ') || null}
                chipLabel={milestone.label}
                chipTone={milestone.tone as ChipTone}
                onClick={() => setSelected(s)}
              />
            );
          })}
        </DeliverableList>
      )}

      <SystemDrawer
        system={selected}
        handoverPoint={handoverPoint}
        projectId={handoverPoint.handover_plan_id ? null : null}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
};
