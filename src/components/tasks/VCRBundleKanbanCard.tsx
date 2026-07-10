import React from 'react';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VCRBundleTask } from '@/hooks/useUserVCRBundleTasks';
import { shortVCRCode } from '@/components/widgets/p2a-wizard/steps/phases/vcrDisplayUtils';

/**
 * Mockup v3 task-card pair — one card per VCR per user, both bundle types
 * share this layout. Metric bindings:
 *
 *  DELIVERING (vcr_checklist_bundle):
 *    - pct              ← user_tasks.progress_percentage (trigger-owned)
 *    - approved (a)     ← count(sub_items[].completed)
 *    - total   (t)      ← sub_items.length
 *    - under_review (r) ← metadata.delivering_under_review (server-derived)
 *                         when present, else 0 (safe fallback — bar just
 *                         shows green + track)
 *    - to_deliver (d)   ← t - a - r
 *
 *  APPROVING (vcr_approval_bundle) — trigger-maintained fields ONLY, per the
 *  in-code warning in useUnifiedTasks (do NOT build a parallel count):
 *    - total      ← metadata.approver_total_items
 *    - decided    ← metadata.approver_decided_items
 *    - approved   ← metadata.approver_accepted_items
 *    - returned   ← metadata.approver_rejected_items
 *    - qualified  ← metadata.approver_qualified_items
 *    - awaiting_n ← total - decided                (rendered as headline)
 *    - parties_k  ← metadata.delivering_parties_count
 */

interface Props {
  bundle: VCRBundleTask;
  onClick: () => void;
  dragHandleProps?: Record<string, any>;
  isChild?: boolean;
}

interface Segments { approvedPct: number; midPct: number; }

const bar = ({ approvedPct, midPct }: Segments) => (
  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex" role="progressbar">
    <div className="h-full bg-emerald-500" style={{ width: `${approvedPct}%` }} />
    <div className="h-full bg-muted-foreground/35" style={{ width: `${midPct}%` }} />
  </div>
);

const statusPill = (label: string, tone: 'grey' | 'amber' | 'green') => (
  <span className={cn(
    'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
    tone === 'green' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    tone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    tone === 'grey'  && 'bg-muted text-muted-foreground',
  )}>{label}</span>
);

const idChip = (code: string) => (
  <span className="text-[10px] font-mono text-muted-foreground/90 bg-muted/60 px-1.5 py-0.5 rounded">
    {code}
  </span>
);

const buildIdCode = (bundle: VCRBundleTask): string => {
  const project = bundle.metadata?.project_code || '';
  const label = shortVCRCode(bundle.metadata?.vcr_label || '');
  if (project && label) return `${project}-${label}`;
  return label || project || 'VCR';
};

const kanbanStatusLabel = (status: string): { label: string; tone: 'grey' | 'amber' | 'green' } => {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'done') return { label: 'Done', tone: 'green' };
  if (s === 'waiting' || s === 'pending') return { label: 'Waiting', tone: 'grey' };
  if (s === 'todo') return { label: 'To do', tone: 'grey' };
  return { label: 'In Progress', tone: 'amber' };
};

export const VCRBundleKanbanCard: React.FC<Props> = ({ bundle, onClick, dragHandleProps, isChild }) => {
  const isApproving = bundle.type === 'vcr_approval_bundle';
  const idCode = buildIdCode(bundle);
  const subItems = bundle.sub_items || [];
  const meta = (bundle.metadata || {}) as Record<string, any>;

  let headline: React.ReactNode;
  let qualifier: string;
  let subtext: string;
  let footer: string | null = null;
  let segments: Segments;
  let pill: { label: string; tone: 'grey' | 'amber' | 'green' };

  // Kanban column is derived purely from task.status: 'completed' → Done.
  // Guard: when the trigger-owned counts still show outstanding work but
  // the card sits in Done, do NOT render a "Needs review" pill (the trigger
  // fix should make this unreachable — warn if it isn't).
  const inDoneColumn = (bundle.status || '').toLowerCase() === 'completed'
                    || (bundle.status || '').toLowerCase() === 'done';

  if (isApproving) {
    const total    = Number(meta.approver_total_items ?? subItems.length ?? 0);
    const decided  = Number(meta.approver_decided_items ?? 0);
    const accepted = Number(meta.approver_accepted_items ?? 0);
    const rejected = Number(meta.approver_rejected_items ?? 0);
    const awaiting = Math.max(0, total - decided);
    const parties  = Number(meta.delivering_parties_count ?? 0);

    const approvedPct = total > 0 ? (accepted / total) * 100 : 0;
    const awaitingPct = total > 0 ? (awaiting / total) * 100 : 0;
    segments = { approvedPct, midPct: awaitingPct };

    headline = <span className="text-xl font-bold text-foreground">{awaiting}</span>;
    qualifier = 'awaiting your review';
    subtext = `${accepted} approved · ${awaiting} awaiting your review · ${rejected} returned`;
    if (parties > 1) footer = `From ${parties} delivering parties`;

    if (inDoneColumn && awaiting > 0) {
      // Incoherent state — counts say outstanding, column says done.
      // Show the counts (Done pill) and warn; trigger fix should prevent this.
      // eslint-disable-next-line no-console
      console.warn(
        '[VCRBundleKanbanCard] approver bundle in Done column with outstanding items',
        { bundleId: bundle.id, awaiting, total, decided, status: bundle.status },
      );
      pill = { label: 'Done', tone: 'green' };
    } else {
      pill = awaiting > 0
        ? { label: 'Needs review', tone: 'amber' }
        : (decided >= total && total > 0)
          ? { label: 'Done', tone: 'green' }
          : { label: 'Up to date', tone: 'grey' };
    }
  } else {
    const total    = subItems.length;
    const approved = subItems.filter((i) => i.completed).length;
    const under    = Number(meta.delivering_under_review ?? 0);
    const toDeliver = Math.max(0, total - approved - under);
    const pct = Number(bundle.progress_percentage ?? (total > 0 ? Math.round((approved / total) * 100) : 0));

    const approvedPct = total > 0 ? (approved / total) * 100 : 0;
    const underPct    = total > 0 ? (under / total) * 100 : 0;
    segments = { approvedPct, midPct: underPct };

    headline = <span className="text-xl font-bold text-foreground">{pct}%</span>;
    qualifier = 'APPROVED';
    subtext = `${approved} of ${total} approved · ${under} under review · ${toDeliver} to deliver`;
    pill = kanbanStatusLabel(bundle.status);
  }

  const title = isApproving
    ? `Review ${shortVCRCode(meta.vcr_label || '')} items${meta.vcr_name ? ` (${meta.vcr_name})` : ''}`
    : `Complete ${shortVCRCode(meta.vcr_label || '')} items${meta.vcr_name ? ` (${meta.vcr_name})` : ''}`;

  return (
    <Card
      onClick={onClick}
      tabIndex={0}
      className={cn(
        'relative overflow-hidden group cursor-pointer transition-all duration-200',
        isChild ? 'p-2.5 rounded-md border-l-2 border-l-border/50 bg-muted/30' :
                  'px-3 py-2.5 pl-4 rounded-lg border border-border/60 bg-card shadow-[0_1px_2px_0_rgb(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Row 1: ID + status pill (+ drag handle on hover) */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {!isChild && dragHandleProps && (
            <button
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="touch-none p-0.5 -ml-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
              aria-label="Drag task"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          {idChip(idCode)}
        </div>
        {statusPill(pill.label, pill.tone)}
      </div>

      {/* Title */}
      <p className="text-[13px] leading-[1.3] font-medium text-foreground mb-1.5 break-words">
        {title}
      </p>

      {/* Headline metric */}
      <div className="flex items-baseline gap-1.5 mb-1.5">
        {headline}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {qualifier}
        </span>
      </div>

      {/* Two-segment stacked bar */}
      {bar(segments)}

      {/* Subtext */}
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
        {subtext}
      </p>

      {/* Optional footer (approver: from N delivering parties) */}
      {footer && (
        <p className="text-[10px] text-muted-foreground/80 italic mt-1">{footer}</p>
      )}
    </Card>
  );
};
