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
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);

  const rows = useMemo(() => {
    if (!categoryCode) return [];
    const mapped = prerequisites
      .filter(p => normalizeCategoryCode(p.category) === categoryCode)
      .map(p => {
        const catCode = normalizeCategoryCode(p.category);
        const code = catCode === 'XX' ? '??' : catCode;
        return {
          prereq: p,
          catCode: code,
          itemCode: formatVcrItemCode(code, p.display_order),
          pill: standardPill(p.status as PrereqStatus),
        };
      });

    // Default sort: Rejected → To do → Under review → Accepted.
    // Qualification-requested rides under "under review" (matches Overview model).
    const bucketRank: Record<string, number> = {
      rework: 0,        // Rejected
      todeliver: 1,     // To do
      pipeline: 2,      // Under review
      qualification: 2, // qualification-requested folds into review
      terminal: 3,      // Accepted / Qualified
    };
    return mapped.sort((a, b) => {
      const ra = bucketRank[a.pill.bucket] ?? 99;
      const rb = bucketRank[b.pill.bucket] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.prereq.display_order ?? 0) - (b.prereq.display_order ?? 0);
    });
  }, [prerequisites, categoryCode]);

  const closed = rows.filter(r => r.pill.bucket === 'terminal').length;
  const meta = categoryCode ? CATEGORY_META[categoryCode] : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col !z-modal-critical">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm font-semibold">
              {meta?.name || 'Category'} — {closed} of {rows.length}
            </SheetTitle>
            <SheetDescription className="text-[11px] text-muted-foreground">
              Click an item for full detail.
            </SheetDescription>
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
                className="w-full text-left px-4 py-2.5 hover:bg-muted/40 flex items-center gap-3"
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
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-foreground truncate">
                    {r.prereq.summary}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground font-mono truncate">
                    {r.itemCode}
                  </div>
                </div>
                <span className={cn(
                  'text-[10.5px] font-semibold rounded-full px-2 py-0.5 flex-none',
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
