import React, { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { VCRItemDetailSheet, type VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { useVcrBundleEnrichedItems, type VCRBundleEnrichedItem } from './useVcrBundleEnrichedItems';
import { PanelGroup, PanelRow } from './MyVCRItemsPanel';
import { shortVCRCode } from '@/components/widgets/p2a-wizard/steps/phases/vcrDisplayUtils';
import type { VCRBundleTask } from '@/hooks/useUserVCRBundleTasks';

/**
 * Approver "Items to review" panel (mockup v3, section C).
 * Supersedes VCRApprovalBundleSheet for vcr_approval_bundle clicks.
 * Row click opens VCRItemDetailSheet — the drawer's approver footer
 * (Accept / Return) is the only decision surface.
 *
 * Groups (bound to real vcr_prerequisite_approvals.status enum):
 *   AWAITING YOUR REVIEW ← ledger PENDING  AND prereq.status = READY_FOR_REVIEW (or later)
 *   WITH DELIVERING PARTY ← ledger PENDING AND prereq not yet submitted for review
 *   RETURNED             ← ledger REJECTED
 *   APPROVED             ← ledger ACCEPTED or QUALIFIED
 *
 * Metric bar and headline read the trigger-maintained bundle fields — this
 * component MUST NOT compute its own totals from the ledger (per the
 * useUnifiedTasks warning).
 */

interface Props {
  bundle: VCRBundleTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Group = 'awaitingYou' | 'withDelivering' | 'returned' | 'approved';

const isSubmitted = (s: VCRBundleEnrichedItem['status']): boolean =>
  s === 'READY_FOR_REVIEW' || s === 'QUALIFICATION_REQUESTED' ||
  s === 'ACCEPTED' || s === 'REJECTED' || s === 'QUALIFICATION_APPROVED';

const classify = (it: VCRBundleEnrichedItem): Group => {
  const l = it.ledger_status;
  if (l === 'ACCEPTED' || l === 'QUALIFIED') return 'approved';
  if (l === 'REJECTED') return 'returned';
  // PENDING or null
  if (isSubmitted(it.status)) return 'awaitingYou';
  return 'withDelivering';
};

const chip = (label: string, tone: 'grey' | 'amber' | 'red' | 'green') => (
  <span className={cn(
    'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
    tone === 'green' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    tone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    tone === 'red'   && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    tone === 'grey'  && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  )}>{label}</span>
);

export const VCRItemsToReviewPanel: React.FC<Props> = ({ bundle, open, onOpenChange }) => {
  const navigate = useNavigate();
  const meta = (bundle?.metadata || {}) as Record<string, any>;
  const projectCode = meta.project_code || '';
  const vcrShort = shortVCRCode(meta.vcr_label || '');
  const vcrName = meta.vcr_name || '';
  const idCode = projectCode && vcrShort ? `${projectCode}-${vcrShort}` : (vcrShort || projectCode || 'VCR');
  const vcrId = meta.vcr_id as string | undefined;
  const projectId = meta.project_id as string | undefined;

  const total    = Number(meta.approver_total_items ?? bundle?.sub_items?.length ?? 0);
  const decided  = Number(meta.approver_decided_items ?? 0);
  const accepted = Number(meta.approver_accepted_items ?? 0);
  const rejected = Number(meta.approver_rejected_items ?? 0);
  // Trigger-maintained counter (PENDING ledger + submitted prereq). Fallback
  // to derived value only if the field is missing on legacy rows.
  const awaiting = meta.approver_awaiting_items != null
    ? Number(meta.approver_awaiting_items)
    : Math.max(0, total - decided);
  const parties  = Number(meta.delivering_parties_count ?? 0);
  const approvedPct = total > 0 ? (accepted / total) * 100 : 0;
  const awaitingPct = total > 0 ? (awaiting / total) * 100 : 0;

  const { data: items = [] } = useVcrBundleEnrichedItems(bundle, { forApprover: true });
  const [selected, setSelected] = useState<VCRItemBasic | null>(null);

  // Resolve delivering-party role labels (e.g. "Process TA2 – Project") to the
  // current holder person (e.g. "Anuarbek …"), mirroring VCRItemDetailSheet.
  // Falls back to the role label when the resolver returns no holder.
  const partyLabels = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => { if (it.delivering_party_name) s.add(it.delivering_party_name); });
    return Array.from(s);
  }, [items]);
  const { data: holdersByLabel = {} } = useProjectRoleHolders(projectId || undefined, partyLabels);
  const resolveDeliverer = (label: string | null): string | null => {
    if (!label) return null;
    const holders = holdersByLabel[label];
    return holders && holders.length > 0 ? holders[0].full_name : label;
  };

  const groups = useMemo(() => {
    const buckets: Record<Group, VCRBundleEnrichedItem[]> = {
      awaitingYou: [], withDelivering: [], returned: [], approved: [],
    };
    items.forEach((it) => { buckets[classify(it)].push(it); });
    (Object.keys(buckets) as Group[]).forEach((k) => {
      buckets[k].sort((a, b) => a.item_code.localeCompare(b.item_code));
    });
    return buckets;
  }, [items]);

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
                <span className="text-xl font-bold text-foreground">{awaiting}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Awaiting your review</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${approvedPct}%` }} />
                <div className="h-full bg-muted-foreground/35" style={{ width: `${awaitingPct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {accepted} approved · {awaiting} awaiting your review · {rejected} returned
              </p>
            </div>
          </SheetHeader>


          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5">
              <PanelGroup
                title="AWAITING YOUR REVIEW"
                items={groups.awaitingYou}
                defaultOpen
                render={(it: VCRBundleEnrichedItem) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={chip('Review', 'amber')}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              <PanelGroup
                title="NOT YET SUBMITTED"
                items={groups.withDelivering}
                render={(it: VCRBundleEnrichedItem) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={chip('Awaiting', 'grey')}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              <PanelGroup
                title="RETURNED"
                items={groups.returned}
                render={(it: VCRBundleEnrichedItem) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={chip('Returned', 'red')}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              <PanelGroup
                title="APPROVED"
                items={groups.approved}
                render={(it: VCRBundleEnrichedItem) => (
                  <PanelRow
                    key={it.prerequisite_id}
                    item={it}
                    right={chip('Approved', 'green')}
                    onClick={() => openItem(it)}
                  />
                )}
              />
              {items.length === 0 && (
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
