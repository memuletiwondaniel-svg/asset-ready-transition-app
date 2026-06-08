import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyPrereqApproval, type LedgerStatus } from '@/hooks/useMyPrereqApproval';
import type { VCRBundleTask, VCRSubItem } from '@/hooks/useUserVCRBundleTasks';
import { cn } from '@/lib/utils';

interface Props {
  bundle: VCRBundleTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * E-1c minimal action surface for vcr_approval_bundle user_tasks.
 *
 * One row per sub_item (prerequisite). Reuses useMyPrereqApproval — the SAME
 * hook PrerequisiteDetailSheet uses. RLS restricts writes to the caller's own
 * ledger row (approver_user_id = auth.uid()); the
 * recompute_vcr_prerequisite_from_approvals trigger handles parent prereq
 * roll-up. We never flip prereq.status from the client.
 */
export const VCRApprovalBundleSheet: React.FC<Props> = ({ bundle, open, onOpenChange }) => {
  if (!bundle) return null;

  const prereqIds = (bundle.sub_items || [])
    .map((s) => s.prerequisite_id)
    .filter((x): x is string => !!x);

  // N-of-M accepted counts per prereq (all approvers, not just current user).
  const { data: counts } = useQuery({
    enabled: open && prereqIds.length > 0,
    queryKey: ['vcr-bundle-approval-counts', bundle.id, prereqIds],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_prerequisite_approvals')
        .select('prerequisite_id,status')
        .in('prerequisite_id', prereqIds);
      if (error) throw error;
      const map = new Map<string, { total: number; accepted: number }>();
      (data || []).forEach((row: any) => {
        const cur = map.get(row.prerequisite_id) ?? { total: 0, accepted: 0 };
        cur.total += 1;
        if (row.status === 'ACCEPTED') cur.accepted += 1;
        map.set(row.prerequisite_id, cur);
      });
      return map;
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{bundle.title}</SheetTitle>
          <SheetDescription>
            Decide each prerequisite below. Your decision is recorded for your
            approver role only — other approvers act independently.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 max-h-[calc(100vh-12rem)] pr-2">
          <div className="space-y-3">
            {bundle.sub_items.map((item, idx) => (
              <PrereqRow
                key={item.prerequisite_id ?? idx}
                item={item}
                counts={item.prerequisite_id ? counts?.get(item.prerequisite_id) : undefined}
              />
            ))}
          </div>
        </ScrollArea>

        <Separator className="my-4" />
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const statusLabel: Record<LedgerStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  QUALIFIED: 'Qualification raised',
};

const PrereqRow: React.FC<{
  item: VCRSubItem;
  counts?: { total: number; accepted: number };
}> = ({ item, counts }) => {
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const { ledger, canDecide, accept, reject, qualify, isDeciding } =
    useMyPrereqApproval(item.prerequisite_id);

  // Soft evidence warning (E-1c): warn, don't block.
  const hasEvidence = !!(item as any).hasEvidence; // sub_items don't carry this; treat as unknown → warn-once below
  const showEvidenceWarn = false; // server is authoritative; we only render the user's state.

  if (!item.prerequisite_id) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        {item.summary} — missing prerequisite link.
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium leading-snug">{item.summary}</div>
        {counts && counts.total > 0 && (
          <Badge variant="secondary" className="shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {counts.accepted} of {counts.total} accepted
          </Badge>
        )}
      </div>

      {!ledger && (
        <p className="text-xs text-muted-foreground italic">
          You are not an approver for this item.
        </p>
      )}

      {ledger && !canDecide && (
        <p className="text-xs text-muted-foreground italic">
          Your decision: <span className="font-medium">{statusLabel[ledger.status]}</span>
          {ledger.status !== 'PENDING' && ' — awaiting other approvers.'}
        </p>
      )}

      {ledger && canDecide && (
        <div className="space-y-2">
          {showComment && (
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              className="min-h-[60px] text-sm"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => accept(comment || undefined)}
              disabled={isDeciding}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => reject(comment || undefined)}
              disabled={isDeciding}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => qualify(comment || undefined)}
              disabled={isDeciding}
            >
              Raise Qualification
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowComment((s) => !s)}
            >
              {showComment ? 'Hide comment' : 'Add comment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
