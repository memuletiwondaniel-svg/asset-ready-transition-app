import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRPartiesRollup } from './useVCRPartiesRollup';
import { VCRItemDetailSheet, VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import {
  standardPill, normalizeCategoryCode, CATEGORY_META, PrereqStatus,
} from './standardStatus';

interface Props {
  handoverPointId: string;
  categoryCode: 'DI' | 'TI' | 'OI' | 'MS' | 'HS' | null;
  projectId?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * D5 — Category items drawer.
 * Opened by clicking a donut on the Overview tab; lists that category's items
 * with status pills; each row opens the shared VCRItemDetailSheet.
 */
export const CategoryItemsDrawer: React.FC<Props> = ({
  handoverPointId, categoryCode, projectId, onOpenChange,
}) => {
  const open = !!categoryCode;
  const { prerequisites } = useVCRPrerequisites(handoverPointId);
  const { data: partiesRollup } = useVCRPartiesRollup(handoverPointId, projectId || null);
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!categoryCode) return [];
    const q = search.trim().toLowerCase();
    const mapped = prerequisites
      .filter(p => normalizeCategoryCode(p.category) === categoryCode)
      .map(p => {
        const catCode = normalizeCategoryCode(p.category);
        const code = catCode === 'XX' ? '??' : catCode;
        const delivering = partiesRollup?.deliveringByPrereq[p.id] || [];
        const approving = partiesRollup?.approvingByPrereq[p.id] || [];
        const partyNames = [...delivering, ...approving].join(' ');
        return {
          prereq: p,
          catCode: code,
          itemCode: formatVcrItemCode(code, p.display_order),
          pill: standardPill(p.status as PrereqStatus),
          partyNames,
        };
      })
      .filter(r => {
        if (!q) return true;
        return (
          r.itemCode.toLowerCase().includes(q) ||
          (r.prereq.summary || '').toLowerCase().includes(q) ||
          r.partyNames.toLowerCase().includes(q)
        );
      });

    // Drawer-specific default sort: Rejected → To do → Under review → Accepted.
    // Status-to-bucket mapping per standardStatus.ts:
    //   Rejected               = REJECTED                → bucket 'rework'        → rank 0
    //   To do (to deliver)     = NOT_STARTED             → bucket 'todeliver'     → rank 1
    //   Under review           = READY_FOR_REVIEW /      → bucket 'pipeline'      → rank 2
    //                            IN_PROGRESS
    //   Under review (qual)    = QUALIFICATION_REQUESTED → bucket 'qualification' → rank 2
    //   Accepted               = ACCEPTED /              → bucket 'terminal'      → rank 3
    //                            QUALIFICATION_APPROVED
    // Note: this is intentionally independent of StandardItemsTab.bucketPriority.
    const drawerBucketRank: Record<string, number> = {
      rework: 0,
      todeliver: 1,
      pipeline: 2,
      qualification: 2,
      terminal: 3,
    };
    return mapped.sort((a, b) => {
      const ra = drawerBucketRank[a.pill.bucket] ?? 99;
      const rb = drawerBucketRank[b.pill.bucket] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.prereq.display_order ?? 0) - (b.prereq.display_order ?? 0);
    });
  }, [prerequisites, categoryCode, partiesRollup, search]);

  const closed = rows.filter(r => r.pill.bucket === 'terminal').length;
  const meta = categoryCode ? CATEGORY_META[categoryCode] : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 flex flex-col !z-modal-critical">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle className="text-[19px] font-bold tracking-tight leading-tight text-foreground">
              {meta?.name || 'Category'}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              {closed} of {rows.length} approved
            </SheetDescription>
            <div className="relative mt-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, description, party…"
                className="h-7 pl-7 text-[11.5px]"
              />
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No items in this category.
              </div>
            )}
            {rows.map(r => (
              <button
                key={r.prereq.id}
                className="w-full text-left px-4 py-3 cursor-pointer flex items-start gap-3 group transition-all duration-[120ms] hover:bg-[#F8FAFD] hover:shadow-[inset_3px_0_0_0_#1D4ED8]"
                onClick={() => setOpenItem({
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
                } as unknown as VCRItemBasic)}
              >
                <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-foreground">
                  <span className="inline-block align-baseline mr-2 px-1.5 py-0.5 rounded bg-[#EEF2F7] dark:bg-muted/60 text-[10.5px] font-mono font-medium text-muted-foreground transition-all duration-[120ms] group-hover:bg-[#DBE7FB] group-hover:text-[#1D4ED8] group-hover:-translate-y-[0.5px] dark:group-hover:bg-[#DBE7FB]">
                    {r.itemCode}
                  </span>
                  <span className="font-medium break-words">
                    {r.prereq.summary}
                  </span>
                </div>
                <span className={cn(
                  'text-[10.5px] font-semibold rounded-full px-2 py-0.5 flex-none mt-0.5',
                  r.pill.className,
                )}>
                  {r.pill.label}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <VCRItemDetailSheet
        item={openItem}
        open={!!openItem}
        onOpenChange={(o) => !o && setOpenItem(null)}
        vcrId={handoverPointId}
        projectIdOverride={projectId}
      />
    </>
  );
};
