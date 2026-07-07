import React from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useHandoverPointSystems } from '../../hooks/useP2AHandoverPoints';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { CategoryItemsDrawer } from './CategoryItemsDrawer';
import {
  PrereqStatus,
  CATEGORY_META,
  normalizeCategoryCode,
  rollup,
  emptyCounts,
} from './standardStatus';

interface Props { handoverPoint: P2AHandoverPoint }

/**
 * Progress colour model (DC1, mockup v14.2):
 *   Approved (terminal)  → existing emerald  (#059669)
 *   In review (pipeline + qualification requested) → slate-400  (#94A3B8)
 *   Rework   (rejected)  → slate-300  (#CBD5E1)
 *   To deliver (not started / other) → slate-200  (#E2E8F0)
 * A qualified-but-not-yet-approved item is NOT its own colour; it rides on
 * the underlying state (we surface it here under "in review").
 */
const CLR_APPROVED  = '#059669';
const CLR_INREVIEW  = '#94A3B8';
const CLR_REWORK    = '#CBD5E1';
const CLR_TODELIVER = '#E2E8F0';

/** Segmented progress bar: emerald approved + grey ramp remainder. */
const SegmentedBar: React.FC<{ approved: number; inReview: number; rework: number; toDeliver: number; total: number }> = ({
  approved, inReview, rework, toDeliver, total,
}) => {
  if (total === 0) return <div className="h-2 bg-slate-100 rounded-full" />;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
      <div className="h-full" style={{ width: `${pct(approved)}%`,  background: CLR_APPROVED }} />
      <div className="h-full" style={{ width: `${pct(inReview)}%`,  background: CLR_INREVIEW }} />
      <div className="h-full" style={{ width: `${pct(rework)}%`,    background: CLR_REWORK }} />
      <div className="h-full" style={{ width: `${pct(toDeliver)}%`, background: CLR_TODELIVER }} />
    </div>
  );
};

/** Conic donut per category — emerald approved arc, grey ramp for the rest. */
const Donut: React.FC<{
  approved: number; inReview: number; rework: number; toDeliver: number; total: number;
  label: string; onClick?: () => void; disabled?: boolean;
}> = ({ approved, inReview, rework, toDeliver, total, label, onClick, disabled }) => {
  const p = (n: number) => (total ? (n / total) * 100 : 0);
  const a = p(approved);
  const b = a + p(inReview);
  const c = b + p(rework);
  const bg = total
    ? `conic-gradient(${CLR_APPROVED} 0 ${a}%, ${CLR_INREVIEW} ${a}% ${b}%, ${CLR_REWORK} ${b}% ${c}%, ${CLR_TODELIVER} ${c}% 100%)`
    : '#F1F5F9';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !total}
      className="flex flex-col items-center gap-1.5 flex-1 min-w-[104px] rounded-md p-1 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60 disabled:cursor-default"
      aria-label={`Open ${label} items`}
    >
      <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: bg }}>
        <div className="absolute inset-1.5 rounded-full bg-background flex items-center justify-center text-xs font-bold text-foreground">
          {approved}/{total || 0}
        </div>
      </div>
      <span className="text-[9.5px] font-bold tracking-wide text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </button>
  );
};

/** Small muted colour swatch + label pair for the progress-bar legend. */
const LegendSwatch: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="inline-block w-2 h-2 rounded-sm" style={{ background: color }} />
    {label}
  </span>
);


export const StandardOverviewTab: React.FC<Props> = ({ handoverPoint }) => {
  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { systems } = useHandoverPointSystems(handoverPoint.id);
  const { data: hc } = useVCRHydrocarbonStatus(handoverPoint.id);
  const [showCategories, setShowCategories] = React.useState(true);
  const [drawerCategory, setDrawerCategory] = React.useState<'DI'|'TI'|'OI'|'MS'|'HS'|null>(null);

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

  // DC1: qualification-requested rides along with "in review"; approved fraction
  // drives the headline % and the emerald arc.
  const approvedN  = overall.terminal;
  const inReviewN  = overall.pipeline + overall.qualification;
  const reworkN    = overall.rework;
  const toDeliverN = overall.todeliver;

  const contextBits: string[] = [];
  contextBits.push(`${approvedN} of ${overall.total} items approved`);
  if (inReviewN)  contextBits.push(`${inReviewN} in review`);
  if (reworkN)    contextBits.push(`${reworkN} in rework`);
  if (toDeliverN) contextBits.push(`${toDeliverN} to deliver`);
  const pct = overall.total ? Math.round((approvedN / overall.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Progress</div>
        <div className="flex justify-between items-baseline mb-2">
          <div className="text-base font-bold">
            {pct}%<span className="text-[10.5px] font-semibold text-muted-foreground ml-1 tracking-wide">APPROVED</span>
          </div>
        </div>
        <SegmentedBar
          approved={approvedN}
          inReview={inReviewN}
          rework={reworkN}
          toDeliver={toDeliverN}
          total={overall.total}
        />

        <div className="text-[11px] text-muted-foreground/70 mt-1.5">
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
              <Donut
                key={c.code}
                approved={c.terminal}
                inReview={c.pipeline + c.qualification}
                rework={c.rework}
                toDeliver={c.todeliver}
                total={c.total}
                label={c.label}
                onClick={() => setDrawerCategory(c.code)}
              />
            ))}
          </div>
        )}
      </Card>


      {/* Scope card — description, then a single muted inline metadata caption. */}
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">VCR Scope</div>
        <div className="text-sm mb-3">
          {handoverPoint.description || handoverPoint.name}
        </div>
        <div className="text-xs font-normal text-muted-foreground/70">
          {systems.length > 0 && (
            <span>{systems.length} Systems</span>
          )}
          {systems.length > 0 && hc?.status === 'HC' && (
            <span className="mx-1.5 text-muted-foreground/50">·</span>
          )}
          {hc?.status === 'HC' && (
            <span>Hydrocarbon: Yes</span>
          )}
          {hc?.status === 'NON_HC' && (
            <span>Non-hydrocarbon</span>
          )}
        </div>
      </Card>

      <CategoryItemsDrawer
        handoverPointId={handoverPoint.id}
        categoryCode={drawerCategory}
        onOpenChange={(o) => { if (!o) setDrawerCategory(null); }}
      />
    </div>
  );
};
