import React, { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VCRItemDetailSheet, type VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { useVcrBundleEnrichedItems, type VCRBundleEnrichedItem } from './useVcrBundleEnrichedItems';
import { shortVCRCode } from '@/components/widgets/p2a-wizard/steps/phases/vcrDisplayUtils';
import type { VCRBundleTask } from '@/hooks/useUserVCRBundleTasks';

/**
 * Delivering-party "My items" panel (mockup v3, section B).
 * Scope: THIS user's sub_items in ONE VCR. Rows open the canonical
 * VCRItemDetailSheet — no per-row CTA, no status writes here.
 *
 * Row classification (bound to real p2a_vcr_prerequisites.status enum):
 *   APPROVED      ← status in (ACCEPTED, QUALIFICATION_APPROVED)
 *                    or sub_items[].completed === true
 *   UNDER REVIEW  ← status in (READY_FOR_REVIEW, QUALIFICATION_REQUESTED)
 *   TO DELIVER    ← everything else (NOT_STARTED, IN_PROGRESS, REJECTED)
 *                    REJECTED rows carry a small "Returned" chip.
 */

interface Props {
  bundle: VCRBundleTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Group = 'todeliver' | 'underreview' | 'approved';

const classify = (it: VCRBundleEnrichedItem): Group => {
  if (it.completed_from_bundle || it.status === 'ACCEPTED' || it.status === 'QUALIFICATION_APPROVED') {
    return 'approved';
  }
  if (it.status === 'READY_FOR_REVIEW' || it.status === 'QUALIFICATION_REQUESTED') {
    return 'underreview';
  }
  return 'todeliver';
};

const statusChip = (group: Group, isReturned: boolean) => {
  if (group === 'approved') {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Approved</span>;
  }
  if (group === 'underreview') {
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Under Review</span>;
  }
  return (
    <span className={cn(
      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
      isReturned ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    )}>
      {isReturned ? 'Returned' : 'To Deliver'}
    </span>
  );
};

export const MyVCRItemsPanel: React.FC<Props> = ({ bundle, open, onOpenChange }) => {
  const navigate = useNavigate();
  const meta = (bundle?.metadata || {}) as Record<string, any>;
  const projectCode = meta.project_code || '';
  const vcrShort = shortVCRCode(meta.vcr_label || '');
  const vcrName = meta.vcr_name || '';
  const idCode = projectCode && vcrShort ? `${projectCode}-${vcrShort}` : (vcrShort || projectCode || 'VCR');
  const vcrId = meta.vcr_id as string | undefined;
  const projectId = meta.project_id as string | undefined;

  const { data: items = [] } = useVcrBundleEnrichedItems(bundle, { forApprover: false });

  const [selected, setSelected] = useState<VCRItemBasic | null>(null);

  const groups = useMemo(() => {
    const buckets: Record<Group, VCRBundleEnrichedItem[]> = { todeliver: [], underreview: [], approved: [] };
    items.forEach((it) => { buckets[classify(it)].push(it); });
    (Object.keys(buckets) as Group[]).forEach((k) => {
      buckets[k].sort((a, b) => a.item_code.localeCompare(b.item_code));
    });
    return buckets;
  }, [items]);

  const total = items.length;
  const approvedN = groups.approved.length;
  const underN = groups.underreview.length;
  const toDeliverN = groups.todeliver.length;
  const pct = total > 0 ? Math.round((approvedN / total) * 100) : 0;
  const approvedPct = total > 0 ? (approvedN / total) * 100 : 0;
  const underPct    = total > 0 ? (underN / total) * 100 : 0;

  const openItem = (it: VCRBundleEnrichedItem) => {
    setSelected({
      id: it.vcr_item_id || it.prerequisite_id,
      vcr_item: it.vcr_item_text,
      topic: it.topic,
      category_name: it.category_name,
      category_code: it.category_code,
      status: it.status,
      prerequisite_id: it.prerequisite_id,
      itemCode: it.item_code,
    });
  };

  const openFullVcr = () => {
    if (!projectId || !vcrId) return;
    onOpenChange(false);
    navigate(`/p2a/workspace/${projectId}?vcr=${vcrId}`);
  };

  const vcrShortLabel = vcrShort ? (vcrName ? `${vcrShort} (${vcrName})` : vcrShort) : 'VCR';

  return (
    <>
      <Sheet open={open && !!bundle} onOpenChange={onOpenChange}>
        <SheetContent hideClose className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {idCode}
              </span>
              {projectId && vcrId && (
                <button
                  onClick={openFullVcr}
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                >
                  Open full VCR <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <SheetTitle className="text-[15px] leading-snug font-semibold">
                {vcrShortLabel} items
              </SheetTitle>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl font-bold text-foreground">{pct}%</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Approved</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${approvedPct}%` }} />
                <div className="h-full bg-muted-foreground/35" style={{ width: `${underPct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {approvedN} of {total} approved · {underN} under review · {toDeliverN} to deliver
              </p>
            </div>
          </SheetHeader>


          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5">
              <PanelGroup
                title="TO DELIVER"
                items={groups.todeliver}
                defaultOpen
                render={(it) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={statusChip('todeliver', it.status === 'REJECTED')}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              <PanelGroup
                title="UNDER REVIEW"
                items={groups.underreview}
                render={(it) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={statusChip('underreview', false)}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              <PanelGroup
                title="APPROVED"
                items={groups.approved}
                render={(it) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={statusChip('approved', false)}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              {total === 0 && (
                <p className="text-xs text-muted-foreground italic">No items in this bundle.</p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <VCRItemDetailSheet
        item={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        vcrId={vcrId || ''}
        projectIdOverride={projectId}
      />
    </>
  );
};

// ─── Shared helpers ────────────────────────────────────────────────

export const PanelGroup: React.FC<{
  title: string;
  caption: string;
  items: any[];
  render: (it: any) => React.ReactNode;
}> = ({ title, caption, items, render }) => {
  if (items.length === 0) return null;
  return (
    <section className="space-y-1">
      <h4 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold flex items-center gap-1.5 mb-1">
        <span>{title} ({items.length})</span>
        {caption && <span className="text-muted-foreground/70 normal-case tracking-normal font-normal">· {caption}</span>}
      </h4>
      <ul className="divide-y divide-border/60">
        {items.map(render)}
      </ul>
    </section>
  );
};

export const PanelRow: React.FC<{
  item: VCRBundleEnrichedItem;
  right: React.ReactNode;
  secondary?: React.ReactNode;
  onClick: () => void;
}> = ({ item, right, secondary, onClick }) => {
  // Primary text = the item question (same text the drawer title uses);
  // topic renders as a small muted suffix when present.
  const question = item.vcr_item_text || item.summary || '';
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-start gap-3 px-2 py-2.5 text-left hover:bg-muted/40 transition rounded-sm"
      >
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
          {item.item_code}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] leading-snug text-foreground">
            {question}
            {item.topic && question && (
              <span className="text-muted-foreground/70 ml-1.5">· {item.topic}</span>
            )}
          </div>
          {secondary && <div className="text-[11px] text-muted-foreground mt-0.5">{secondary}</div>}
        </div>
        <div className="shrink-0 mt-0.5">{right}</div>
      </button>
    </li>
  );
};

