import React, { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VCRItemDetailSheet,
  type VCRItemBasic,
} from '@/components/widgets/VCRItemDetailSheet';
import {
  vcrItemRowCode,
  type MyVCRItemTaskRow,
} from '@/hooks/useMyVCRItemTasks';

interface VCRItemTaskListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'delivering' | 'approving';
  projectId: string;
  projectLabel: string;
  rows: MyVCRItemTaskRow[];
}

const statusTone = (status: string, role: 'delivering' | 'approving'): { label: string; cls: string } => {
  if (role === 'approving' && status === 'READY_FOR_REVIEW') {
    return { label: 'Awaiting your review', cls: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' };
  }
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'In progress', cls: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' };
    case 'QUALIFICATION_REQUESTED':
      return { label: 'Qualification raised', cls: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800' };
    case 'REJECTED':
      return { label: 'Returned to you', cls: 'border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800' };
    case 'READY_FOR_REVIEW':
      return { label: 'Submitted', cls: 'border-amber-300 text-amber-700 bg-amber-50' };
    default:
      return { label: 'Not started', cls: 'border-border text-muted-foreground bg-background' };
  }
};

export const VCRItemTaskListSheet: React.FC<VCRItemTaskListSheetProps> = ({
  open,
  onOpenChange,
  role,
  projectId,
  projectLabel,
  rows,
}) => {
  const [selected, setSelected] = useState<{ item: VCRItemBasic; vcrId: string } | null>(null);

  // Group rows by VCR → category (preserves VCR order by code, category by display_order via rows order).
  const grouped = useMemo(() => {
    const byVcr = new Map<string, { vcrId: string; vcrCode: string; vcrName: string; byCategory: Map<string, MyVCRItemTaskRow[]> }>();
    rows.forEach((r) => {
      const key = r.handover_point_id;
      if (!byVcr.has(key)) {
        byVcr.set(key, { vcrId: r.handover_point_id, vcrCode: r.vcr_code, vcrName: r.vcr_name, byCategory: new Map() });
      }
      const vcr = byVcr.get(key)!;
      const cat = r.category_name;
      if (!vcr.byCategory.has(cat)) vcr.byCategory.set(cat, []);
      vcr.byCategory.get(cat)!.push(r);
    });
    // Sort each category's items by display_order
    byVcr.forEach((v) => {
      v.byCategory.forEach((arr) => arr.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
    });
    return Array.from(byVcr.values()).sort((a, b) => a.vcrCode.localeCompare(b.vcrCode));
  }, [rows]);

  const heading = role === 'approving' ? 'Approve VCR items' : 'Complete VCR items';
  const sub = role === 'approving'
    ? `${rows.length} awaiting your review · ${projectLabel}`
    : `${rows.length} to complete · ${projectLabel}`;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-hidden flex flex-col p-0" data-rm-safe>
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <SheetTitle className="text-[15px] leading-snug font-semibold">{heading}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">{sub}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5">
              {grouped.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nothing to action here.</p>
              )}
              {grouped.map((vcr) => (
                <section key={vcr.vcrId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] rounded-md font-normal">
                      {vcr.vcrCode}
                    </Badge>
                    <span className="text-[13px] font-semibold truncate">{vcr.vcrName}</span>
                  </div>

                  {Array.from(vcr.byCategory.entries()).map(([catName, items]) => (
                    <div key={catName} className="space-y-1.5">
                      <h4 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold">
                        {catName}
                      </h4>
                      <ul className="rounded-md border divide-y">
                        {items.map((r) => {
                          const code = vcrItemRowCode(r);
                          const tone = statusTone(r.status, role);
                          return (
                            <li key={r.prerequisite_id || r.vcr_item_id}>
                              <button
                                type="button"
                                onClick={() => setSelected({
                                  vcrId: r.handover_point_id,
                                  item: {
                                    id: r.vcr_item_id,
                                    vcr_item: r.vcr_item,
                                    topic: r.topic,
                                    category_name: r.category_name,
                                    category_code: r.category_code,
                                    status: r.status,
                                    prerequisite_id: r.prerequisite_id,
                                    itemCode: code,
                                  },
                                })}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition"
                              >
                                <Badge variant="outline" className="text-[10px] rounded-md font-normal shrink-0">
                                  {code}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] truncate">{r.topic || r.vcr_item}</div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn('text-[10px] rounded-full px-2 py-0.5 font-normal shrink-0', tone.cls)}
                                >
                                  {tone.label}
                                </Badge>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <VCRItemDetailSheet
        item={selected?.item ?? null}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        vcrId={selected?.vcrId ?? ''}
        projectIdOverride={projectId}
      />
    </>
  );
};
