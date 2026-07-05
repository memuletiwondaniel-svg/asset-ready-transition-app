import React from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useHandoverPointSystems } from '../../hooks/useP2AHandoverPoints';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { format } from 'date-fns';
import {
  PrereqStatus,
  CATEGORY_META,
  normalizeCategoryCode,
  rollup,
  emptyCounts,
} from './standardStatus';

interface Props { handoverPoint: P2AHandoverPoint }

/** Segmented progress bar: green (terminal) · blue (pipeline) · grey (remainder) */
const SegmentedBar: React.FC<{ done: number; pipe: number; total: number }> = ({ done, pipe, total }) => {
  if (total === 0) return <div className="h-2 bg-slate-100 rounded-full" />;
  const donePct = (done / total) * 100;
  const pipePct = (pipe / total) * 100;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
      <div className="h-full bg-emerald-600" style={{ width: `${donePct}%` }} />
      <div className="h-full" style={{ width: `${pipePct}%`, background: '#A8C3EE' }} />
    </div>
  );
};

/** Conic donut per category */
const Donut: React.FC<{ done: number; pipe: number; total: number; label: string }> = ({ done, pipe, total, label }) => {
  const donePct = total ? (done / total) * 100 : 0;
  const pipePct = total ? (pipe / total) * 100 : 0;
  const bg = total
    ? `conic-gradient(#059669 0 ${donePct}%, #A8C3EE ${donePct}% ${donePct + pipePct}%, #E5E9EF ${donePct + pipePct}% 100%)`
    : '#F1F5F9';
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[104px]">
      <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: bg }}>
        <div className="absolute inset-1.5 rounded-full bg-background flex items-center justify-center text-xs font-bold text-foreground">
          {done}/{total || 0}
        </div>
      </div>
      <span className="text-[9.5px] font-bold tracking-wide text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
};

export const StandardOverviewTab: React.FC<Props> = ({ handoverPoint }) => {
  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { systems } = useHandoverPointSystems(handoverPoint.id);
  const { data: hc } = useVCRHydrocarbonStatus(handoverPoint.id);
  const [showCategories, setShowCategories] = React.useState(true);

  const overall = rollup(prerequisites.map(p => p.status as PrereqStatus));

  const perCat = React.useMemo(() => {
    const buckets: Record<'DI'|'TI'|'OI'|'MS'|'HS', PrereqStatus[]> = {
      DI: [], TI: [], OI: [], MS: [], HS: [],
    };
    for (const p of prerequisites) {
      const code = normalizeCategoryCode(p.category);
      if (code !== 'XX') buckets[code].push(p.status as PrereqStatus);
    }
    return (Object.keys(buckets) as Array<keyof typeof buckets>).map(k => ({
      code: k,
      label: CATEGORY_META[k].short,
      ...(buckets[k].length ? rollup(buckets[k]) : emptyCounts()),
    }));
  }, [prerequisites]);

  const contextBits: string[] = [];
  contextBits.push(`${overall.terminal} of ${overall.total} items closed`);
  if (overall.pipeline) contextBits.push(`${overall.pipeline} in review`);
  if (overall.rework) contextBits.push(`${overall.rework} in rework`);
  if (overall.qualification) contextBits.push(`${overall.qualification} qualification`);
  if (overall.todeliver) contextBits.push(`${overall.todeliver} to deliver`);
  const pct = overall.total ? Math.round(((overall.terminal) / overall.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Progress</div>
        <div className="flex justify-between items-baseline mb-2">
          <div className="text-base font-bold">
            {pct}%<span className="text-[10.5px] font-semibold text-muted-foreground ml-1 tracking-wide">COMPLETE</span>
          </div>
        </div>
        <SegmentedBar done={overall.terminal} pipe={overall.pipeline} total={overall.total} />
        <div className="text-xs text-muted-foreground mt-2">
          {contextBits.join(' · ')}
        </div>

        <button
          className="w-full flex justify-between items-center text-[11px] font-semibold text-muted-foreground border-t border-border pt-2.5 mt-3"
          onClick={() => setShowCategories(v => !v)}
        >
          <span>By category</span>
          {showCategories ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showCategories && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {perCat.map(c => (
              <Donut key={c.code} done={c.terminal} pipe={c.pipeline} total={c.total} label={c.label} />
            ))}
          </div>
        )}
      </Card>

      {/* Scope card */}
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">VCR Scope</div>
        <div className="text-sm mb-3">
          {handoverPoint.description || handoverPoint.name}
        </div>
        <div className="flex gap-6 flex-wrap text-xs">
          <div>
            <div className="text-[9.5px] uppercase tracking-wide font-bold text-muted-foreground">Target</div>
            <div className="font-medium text-foreground">
              {handoverPoint.target_date ? format(new Date(handoverPoint.target_date), 'dd-MMM-yyyy') : '—'}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-wide font-bold text-muted-foreground">Systems</div>
            <div className="font-medium text-foreground">{systems.length}</div>
          </div>
          <div>
            <div className="text-[9.5px] uppercase tracking-wide font-bold text-muted-foreground">Hydrocarbon</div>
            <div className="font-medium text-foreground">
              {hc?.status === 'HC' ? 'Yes' : hc?.status === 'NON_HC' ? 'No' : '—'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
