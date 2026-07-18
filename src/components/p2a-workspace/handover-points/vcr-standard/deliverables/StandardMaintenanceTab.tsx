import React, { useMemo, useState } from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { EmptyDeliverable } from './DeliverableRow';
import { SurfaceHeader } from '../../shared/SurfaceHeader';
import { useMaintenanceDeliverables, MaintDeliverable, KIND_META } from '../../maintenance/useMaintenanceDeliverables';
import { MaintenanceDrawer } from '../../maintenance/MaintenanceDrawer';
import { cn } from '@/lib/utils';

const barTone = (pct: number, complete: boolean) => {
  if (complete) return { text: 'text-emerald-700', bar: 'bg-emerald-500' };
  if (pct >= 80) return { text: 'text-emerald-700', bar: 'bg-emerald-500' };
  if (pct >= 40) return { text: 'text-amber-700', bar: 'bg-amber-500' };
  return { text: 'text-red-700', bar: 'bg-red-500' };
};

const Row: React.FC<{ d: MaintDeliverable; onClick: () => void }> = ({ d, onClick }) => {
  const complete = d.percent >= 100;
  const tone = barTone(d.percent, complete);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-blue-50/60 border-b border-border/60 last:border-0"
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[13px] font-medium truncate">{d.display_name || KIND_META[d.deliverable_key]?.label || d.deliverable_key}</div>
        </div>
        {!complete && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden max-w-md">
            <div className={cn('h-full transition-all', tone.bar)} style={{ width: `${d.percent}%` }} />
          </div>
        )}
      </div>
      <div className="shrink-0">
        {complete
          ? <span className="text-[10.5px] font-bold rounded-full border px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Complete</span>
          : <span className={cn('text-[11.5px] font-semibold tabular-nums', tone.text)}>{d.percent}%</span>
        }
      </div>
    </button>
  );
};

export const StandardMaintenanceTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useMaintenanceDeliverables(handoverPoint.id);
  const [selected, setSelected] = useState<MaintDeliverable | null>(null);

  const rows = useMemo(() => {
    const list = data || [];
    return [...list].sort((a, b) => {
      const ca = a.percent >= 100 ? 1 : 0;
      const cb = b.percent >= 100 ? 1 : 0;
      if (ca !== cb) return ca - cb; // completes to bottom
      return a.percent - b.percent; // ascending %
    });
  }, [data]);

  const narrative = useMemo(() => {
    const list = data || [];
    if (list.length === 0) return null;
    const done = list.filter((d) => d.percent >= 100).length;
    const atRisk = list.filter((d) => d.percent < 40 && d.percent < 100).length;
    const avg = Math.round(list.reduce((s, d) => s + d.percent, 0) / list.length);
    const parts = [`**${done} of ${list.length}** maintenance deliverables complete · **${avg}%** average.`];
    if (atRisk > 0) parts.push(`**${atRisk}** below 40%.`);
    return parts.join(' ');
  }, [data]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading maintenance systems…</div>;

  return (
    <div className="space-y-4">
      <SurfaceHeader
        title="Maintenance Systems"
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        narrative={narrative}
      />

      {rows.length === 0 ? (
        <EmptyDeliverable
          label="No maintenance-system deliverables marked applicable yet."
          hint="ARB, PMs, spares and criticality items are flagged during plan definition."
        />
      ) : (
        <div className="rounded-lg border bg-background overflow-hidden">
          {rows.map((d) => (
            <Row key={d.id} d={d} onClick={() => setSelected(d)} />
          ))}
        </div>
      )}

      <MaintenanceDrawer
        deliverable={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
      />
    </div>
  );
};
