import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites, VCRPrerequisite } from '../../hooks/useVCRPrerequisites';
import { VCRItemDetailSheet, VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { standardPill, normalizeCategoryCode, CATEGORY_META, PrereqStatus, StandardBucket } from './standardStatus';

interface Props { handoverPoint: P2AHandoverPoint; projectId?: string }

type Filter = 'all' | 'rework' | 'pipeline' | 'qualification' | 'terminal';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rework', label: 'Rework' },
  { id: 'pipeline', label: 'In review' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'terminal', label: 'Terminal' },
];

const matchesFilter = (bucket: StandardBucket, f: Filter): boolean => {
  if (f === 'all') return true;
  if (f === 'pipeline') return bucket === 'pipeline';
  return bucket === f;
};

/** Per-row Rev annotation was removed with the heuristic. Row-level rev is not
 *  a real concept — the whole VCR carries a single Rev number sourced from
 *  vcr_plan_approval_events (see `useVCRRev` in the header). Rework rows show
 *  their status pill; anything more would fabricate a number. */

export const StandardItemsTab: React.FC<Props> = ({ handoverPoint, projectId }) => {
  const { prerequisites, isLoading } = useVCRPrerequisites(handoverPoint.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);

  const rows = useMemo(() => {
    const withPill = prerequisites.map(p => {
      const cat = normalizeCategoryCode(p.category);
      const pill = standardPill(p.status as PrereqStatus);
      const code = cat === 'XX' ? '??' : cat;
      return {
        prereq: p,
        catCode: code,
        itemCode: formatVcrItemCode(code, p.display_order),
        pill,
      };
    });
    // Filter
    const filtered = withPill.filter(r => matchesFilter(r.pill.bucket, filter));
    // Rework pinned first, then original order
    filtered.sort((a, b) => {
      const ar = a.pill.bucket === 'rework' ? 0 : 1;
      const br = b.pill.bucket === 'rework' ? 0 : 1;
      if (ar !== br) return ar - br;
      return (a.prereq.display_order ?? 0) - (b.prereq.display_order ?? 0);
    });
    return filtered;
  }, [prerequisites, filter]);

  const openRow = (r: typeof rows[number]) => {
    setOpenItem({
      id: r.prereq.id,
      vcr_item: r.prereq.summary,
      topic: null,
      category_name: r.catCode !== '??' && r.catCode in CATEGORY_META
        ? CATEGORY_META[r.catCode as keyof typeof CATEGORY_META].name
        : (r.prereq.category || 'Uncategorized'),
      category_code: r.catCode,
      status: r.prereq.status,
      prerequisite_id: r.prereq.id,
      itemCode: r.itemCode,
    });
  };

  return (
    <Card className="overflow-hidden">
      {/* Filter chips */}
      <div className="flex gap-1.5 p-2.5 border-b border-border bg-muted/30 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'text-[11px] font-semibold px-3 py-0.5 rounded-full border transition',
              filter === f.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading items…</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">No items match this filter.</div>
      ) : (
        <div className="divide-y divide-border/60">
          {rows.map(r => (
            <button
              key={r.prereq.id}
              onClick={() => openRow(r)}
              className={cn(
                'w-full flex items-baseline gap-3 px-4 py-2.5 text-left transition',
                r.pill.bucket === 'rework'
                  ? 'bg-red-50/70 hover:bg-red-50'
                  : 'hover:bg-muted/40'
              )}
            >
              <div className="w-[52px] flex-none font-mono text-[11px] text-muted-foreground leading-tight">
                {r.itemCode}
              </div>
              <div className="flex-1 text-[13px] font-normal leading-snug">{r.prereq.summary}</div>
              <div
                className={cn(
                  'w-[92px] flex-none text-center text-[10.5px] font-bold py-0.5 rounded-full',
                  r.pill.className
                )}
              >
                {r.pill.label}
              </div>
            </button>
          ))}
        </div>
      )}

      <VCRItemDetailSheet
        item={openItem}
        open={!!openItem}
        onOpenChange={(o) => !o && setOpenItem(null)}
        vcrId={handoverPoint.id}
        projectIdOverride={projectId}
      />
    </Card>
  );
};
