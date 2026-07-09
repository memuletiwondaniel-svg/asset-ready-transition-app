import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRPartiesRollup } from './useVCRPartiesRollup';
import { VCRItemDetailSheet, VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import {
  standardPill,
  qualificationPill,
  QualStage,
  normalizeCategoryCode,
  CATEGORY_META,
  PrereqStatus,
  StandardBucket,
} from './standardStatus';

interface Props { handoverPoint: P2AHandoverPoint; projectId?: string }

/**
 * Filter chip identifiers.
 *   Status chips (rework / todeliver / pipeline / terminal) UNION with each other
 *     — an item has only one status, so intersecting would show nothing.
 *   The `qualification` chip INTERSECTS with the status chips —
 *     it narrows the qualification set to the picked stage(s):
 *       qualification alone           → every qualification (all 4 stages)
 *       qualification + pipeline      → only PENDING (amber) qualifications
 *       qualification + rework        → only REJECTED (red) qualifications
 *       qualification + terminal      → only APPROVED (green) qualifications
 *       qualification + todeliver     → only DRAFT (grey) qualifications
 */
type StatusChip = 'rework' | 'todeliver' | 'pipeline' | 'terminal';
type ActiveFilter = StatusChip | 'qualification';
type Filter = 'all' | ActiveFilter;

type SortCol = 'id' | 'description' | 'status';
type SortDir = 'asc' | 'desc';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rework', label: 'Rework' },
  { id: 'todeliver', label: 'To Deliver' },
  { id: 'pipeline', label: 'In review' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'terminal', label: 'Approved' },
];

const QUAL_STAGE_TO_BUCKET: Record<QualStage, StatusChip> = {
  DRAFT: 'todeliver',
  PENDING: 'pipeline',
  APPROVED: 'terminal',
  REJECTED: 'rework',
};

/** Bucket-order priority when no user sort applied. */
const bucketPriority = (bucket: StandardBucket, status: PrereqStatus): number => {
  if (bucket === 'rework') return 0;
  if (bucket === 'qualification') return 2;
  if (bucket === 'pipeline') return 3;
  if (bucket === 'terminal') return 4;
  if (status === 'NOT_STARTED') return 1;
  return 5;
};

export const StandardItemsTab: React.FC<Props> = ({ handoverPoint, projectId }) => {
  const { prerequisites, isLoading } = useVCRPrerequisites(handoverPoint.id);
  const { data: partiesRollup } = useVCRPartiesRollup(handoverPoint.id, projectId || null);

  // Qualification overlay: latest qualification per prerequisite for this VCR.
  const { data: qualsByPrereq } = useQuery({
    queryKey: ['vcr-quals-overlay', handoverPoint.id],
    enabled: !!handoverPoint.id,
    queryFn: async (): Promise<Record<string, QualStage>> => {
      const prereqIds = (prerequisites || []).map(p => p.id);
      if (!prereqIds.length) return {};
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_qualifications')
        .select('vcr_prerequisite_id,status,submitted_at')
        .in('vcr_prerequisite_id', prereqIds)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, QualStage> = {};
      for (const q of (data || []) as any[]) {
        if (!map[q.vcr_prerequisite_id]) map[q.vcr_prerequisite_id] = q.status as QualStage;
      }
      return map;
    },
  });

  const [activeFilters, setActiveFilters] = useState<Set<ActiveFilter>>(new Set());
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir } | null>(null);
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);

  const toggleFilter = (id: Filter) => {
    if (id === 'all') { setActiveFilters(new Set()); return; }
    const activeId = id as ActiveFilter;
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(activeId)) next.delete(activeId);
      else next.add(activeId);
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
      const qualStage = qualsByPrereq?.[p.id];
      const qual = qualStage ? qualificationPill(qualStage) : null;
      /** The badge that actually renders (Model A — ONE badge per row).
       *  If a qualification exists, the "Qualification" badge (coloured by stage)
       *  IS the effective status. Otherwise the plain item-status badge is used. */
      const effectiveBucket: StatusChip = qual
        ? QUAL_STAGE_TO_BUCKET[qual.stage]
        : (pill.bucket === 'qualification'
            // Parent item flagged qualification but no qual row loaded yet → treat as pipeline
            ? 'pipeline'
            : (pill.bucket as StatusChip));
      return {
        prereq: p,
        catCode: code,
        itemCode: formatVcrItemCode(code, p.display_order),
        pill,
        qual,
        effectiveBucket,
        partyNames: [...delivering, ...approving].join(' '),
      };
    });

    const q = search.trim().toLowerCase();

    // Compose filters:
    //   qualification chip INTERSECTS with status chip(s).
    //   status chips UNION with each other.
    const hasQualChip = activeFilters.has('qualification');
    const statusChips = [...activeFilters].filter(f => f !== 'qualification') as StatusChip[];

    const filtered = withPill.filter(r => {
      if (activeFilters.size > 0) {
        if (hasQualChip) {
          if (!r.qual) return false;
          if (statusChips.length > 0 && !statusChips.includes(r.effectiveBucket)) return false;
        } else {
          // Only status chips active → union across statuses.
          if (!statusChips.includes(r.effectiveBucket)) return false;
        }
      }
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
        else cmp = a.effectiveBucket.localeCompare(b.effectiveBucket);
        return sort.dir === 'asc' ? cmp : -cmp;
      }
      const pa = bucketPriority(a.pill.bucket, a.prereq.status as PrereqStatus);
      const pb = bucketPriority(b.pill.bucket, b.prereq.status as PrereqStatus);
      if (pa !== pb) return pa - pb;
      return (a.prereq.display_order ?? 0) - (b.prereq.display_order ?? 0);
    });
    return filtered;
  }, [prerequisites, partiesRollup, qualsByPrereq, activeFilters, search, sort]);

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
      return null;
    });
  };

  const sortIcon = (col: SortCol) => {
    if (!sort || sort.col !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sort.dir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <Card className="overflow-hidden flex flex-col max-h-[calc(100vh-260px)]">
      {/* Scroll container — sticky toolbar + column header live INSIDE this element */}
      <div className="relative overflow-y-auto flex-1">
        {/* Sticky toolbar: filter chips + search */}
        <div className="sticky top-0 z-20 flex items-center gap-2 p-2.5 border-b border-border bg-muted/95 backdrop-blur flex-wrap">
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
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Status colour legend"
                  className="h-7 w-7 flex-none inline-flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="w-72 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-2">
                  Universal status colours
                </div>
                <ul className="space-y-1.5 text-[11.5px] text-foreground/80">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-slate-300 flex-none" />
                    <span><b>Grey</b> — To deliver / Draft (not started)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-amber-400 flex-none" />
                    <span><b>Amber</b> — Under review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 flex-none" />
                    <span><b>Green</b> — Approved / Completed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 flex-none" />
                    <span><b>Red</b> — Rework required (rejected)</span>
                  </li>
                </ul>
                <div className="mt-2 pt-2 border-t border-border text-[10.5px] text-muted-foreground leading-snug">
                  One badge per row. When a qualification exists the badge shows "Qualification" coloured by stage; otherwise it shows the item status.
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="relative w-56 flex-none">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, description, party…"
              className="h-7 pl-7 text-[11.5px] placeholder:text-[10px] placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Sticky column header row */}
        <div className="sticky top-[46px] z-10 flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-muted/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <button onClick={() => toggleSort('id')} className="w-[52px] flex-none flex items-center gap-1 hover:text-foreground">
            ID {sortIcon('id')}
          </button>
          <button onClick={() => toggleSort('description')} className="flex-1 flex items-center gap-1 hover:text-foreground text-left">
            Description {sortIcon('description')}
          </button>
          <button onClick={() => toggleSort('status')} className="w-[110px] flex-none flex items-center justify-center gap-1 hover:text-foreground">
            Status {sortIcon('status')}
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading items…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No items match this filter.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map(r => {
              // Model A — ONE badge per row.
              const badge = r.qual
                ? { label: 'Qualification' as const, className: r.qual.className, title: `Qualification — ${r.qual.stageLabel}` }
                : { label: r.pill.label, className: r.pill.className, title: r.pill.label };
              return (
                <button
                  key={r.prereq.id}
                  onClick={() => openRow(r)}
                  className={cn(
                    'w-full flex items-baseline gap-3 px-4 py-2.5 text-left transition',
                    r.effectiveBucket === 'rework'
                      ? 'bg-red-50/70 hover:bg-red-100'
                      : 'hover:bg-blue-50/60'
                  )}
                >
                  <div className="w-[52px] flex-none font-mono text-[11px] text-muted-foreground leading-tight">
                    {r.itemCode}
                  </div>
                  <div className="flex-1 text-[13px] font-normal leading-snug">{r.prereq.summary}</div>
                  <div className="w-[110px] flex-none flex items-center justify-end">
                    <span
                      title={badge.title}
                      className={cn(
                        'text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
