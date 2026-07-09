import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRPartiesRollup } from './useVCRPartiesRollup';
import { VCRItemDetailSheet, VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { standardPill, normalizeCategoryCode, CATEGORY_META, PrereqStatus, StandardBucket } from './standardStatus';

interface Props { handoverPoint: P2AHandoverPoint; projectId?: string }

type Filter = 'all' | 'rework' | 'pipeline' | 'qualification' | 'terminal';
type ActiveFilter = Exclude<Filter, 'all'>;
type SortCol = 'id' | 'description' | 'status';
type SortDir = 'asc' | 'desc';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rework', label: 'Rework' },
  { id: 'pipeline', label: 'In review' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'terminal', label: 'Completed' },
];

const matchesFilter = (bucket: StandardBucket, active: Set<ActiveFilter>): boolean => {
  if (active.size === 0) return true;
  return active.has(bucket as ActiveFilter);
};

/** Bucket-order priority when no user sort applied.
 *  Rework → To deliver → Qualification → In review → Accepted (terminal). */
const bucketPriority = (bucket: StandardBucket, status: PrereqStatus): number => {
  if (bucket === 'rework') return 0;
  if (bucket === 'qualification') return 2;
  if (bucket === 'pipeline') return 3;
  if (bucket === 'terminal') return 4;
  // Everything else → treat as "to deliver"
  if (status === 'NOT_STARTED') return 1;
  return 5;
};

export const StandardItemsTab: React.FC<Props> = ({ handoverPoint, projectId }) => {
  const { prerequisites, isLoading } = useVCRPrerequisites(handoverPoint.id);
  const { data: partiesRollup } = useVCRPartiesRollup(handoverPoint.id, projectId || null);
  const [activeFilters, setActiveFilters] = useState<Set<ActiveFilter>>(new Set());
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir } | null>(null);
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);

  const toggleFilter = (id: Filter) => {
    if (id === 'all') {
      setActiveFilters(new Set());
      return;
    }
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = useMemo(() => {
    const withPill = prerequisites.map(p => {
      const cat = normalizeCategoryCode(p.category);
      const pill = standardPill(p.status as PrereqStatus);
      const code = cat === 'XX' ? '??' : cat;
      const delivering = partiesRollup?.deliveringByPrereq[p.id] || [];
      const approving = partiesRollup?.approvingByPrereq[p.id] || [];
      return {
        prereq: p,
        catCode: code,
        itemCode: formatVcrItemCode(code, p.display_order),
        pill,
        partyNames: [...delivering, ...approving].join(' '),
      };
    });

    const q = search.trim().toLowerCase();
    const filtered = withPill.filter(r => {
      if (!matchesFilter(r.pill.bucket, activeFilters)) return false;
      if (!q) return true;
      return (
        r.itemCode.toLowerCase().includes(q) ||
        (r.prereq.summary || '').toLowerCase().includes(q) ||
        r.partyNames.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      if (sort) {
        let cmp = 0;
        if (sort.col === 'id') cmp = a.itemCode.localeCompare(b.itemCode);
        else if (sort.col === 'description')
          cmp = (a.prereq.summary || '').localeCompare(b.prereq.summary || '');
        else cmp = a.pill.label.localeCompare(b.pill.label);
        return sort.dir === 'asc' ? cmp : -cmp;
      }
      // Default: bucket priority, then display order
      const pa = bucketPriority(a.pill.bucket, a.prereq.status as PrereqStatus);
      const pb = bucketPriority(b.pill.bucket, b.prereq.status as PrereqStatus);
      if (pa !== pb) return pa - pb;
      return (a.prereq.display_order ?? 0) - (b.prereq.display_order ?? 0);
    });
    return filtered;
  }, [prerequisites, partiesRollup, activeFilters, search, sort]);

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

  const toggleSort = (col: SortCol) => {
    setSort(prev => {
      if (!prev || prev.col !== col) return { col, dir: 'asc' };
      if (prev.dir === 'asc') return { col, dir: 'desc' };
      return null; // third click clears sort → back to default order
    });
  };

  const sortIcon = (col: SortCol) => {
    if (!sort || sort.col !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sort.dir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <Card className="overflow-hidden">
      {/* Filter chips + search on same row */}
      <div className="flex items-center gap-2 p-2.5 border-b border-border bg-muted/30 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
          {FILTERS.map(f => {
            const isActive = f.id === 'all'
              ? activeFilters.size === 0
              : activeFilters.has(f.id as ActiveFilter);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={cn(
                  'text-[11px] font-semibold px-3 py-0.5 rounded-full border transition',
                  isActive
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-56 flex-none">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, description, party…"
            className="h-7 pl-7 text-[11.5px]"
          />
        </div>
      </div>

      {/* Sortable header row */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <button onClick={() => toggleSort('id')} className="w-[52px] flex-none flex items-center gap-1 hover:text-foreground">
          ID {sortIcon('id')}
        </button>
        <button onClick={() => toggleSort('description')} className="flex-1 flex items-center gap-1 hover:text-foreground text-left">
          Description {sortIcon('description')}
        </button>
        <button onClick={() => toggleSort('status')} className="w-[92px] flex-none flex items-center justify-center gap-1 hover:text-foreground">
          Status {sortIcon('status')}
        </button>
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
                  ? 'bg-red-50/70 hover:bg-red-100'
                  : 'hover:bg-blue-50/60'
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
