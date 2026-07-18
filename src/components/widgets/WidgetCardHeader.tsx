import React from 'react';
import { LucideIcon, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * G1 Widget Card Header — shared across the three Project-Page widgets
 * (Project Overview, ORA Activities, P2A Handover) per the approved 2026-07-18
 * card standard.
 *
 * Rules encoded here (do not duplicate in the widget bodies):
 *   • Inline muted icon on the left. `iconColor` is the identity colour;
 *     the icon renders in `text-muted-foreground` and wakes to that colour
 *     when the parent card is hovered (parent must expose the `group` class).
 *   • Title on one line, truncates.
 *   • Optional status pill (top-right) — passed in as `statusPill` node so
 *     each widget owns its own colour + click routing.
 *   • Optional edit pencil, hover-gated, always calls stopPropagation.
 *   • Hairline (`border-b border-border/60`) under the header so the body
 *     visually separates without a heavy divider.
 *
 * The whole header row is a click-target when `onHeaderClick` is supplied
 * (routes to the widget's canonical primary action per the N-family QAQC).
 * Drag handles are opt-in via `dragProps`.
 */
export interface WidgetCardHeaderProps {
  Icon: LucideIcon;
  /**
   * Full Tailwind class (e.g. 'group-hover:text-blue-600') applied to the
   * icon when the parent card is hovered. Must be a literal so Tailwind's
   * JIT can pick it up — never interpolate at call sites.
   */
  hoverIconClass: string;
  title: string;
  subtitle?: React.ReactNode;
  statusPill?: React.ReactNode;
  onHeaderClick?: () => void;
  onEdit?: () => void;
  dragProps?: {
    attributes?: any;
    listeners?: any;
  };
  className?: string;
  /** Editable "Edit" button title/aria label. */
  editLabel?: string;
}



export const WidgetCardHeader: React.FC<WidgetCardHeaderProps> = ({
  Icon,
  hoverIconClass,
  title,
  subtitle,
  statusPill,
  onHeaderClick,
  onEdit,
  dragProps,
  className,
  editLabel = 'Edit',
}) => {
  return (
    <div
      {...(dragProps?.attributes || {})}
      {...(dragProps?.listeners || {})}
      className={cn(
        'flex-shrink-0 border-b border-border/60 px-5 py-3.5',
        dragProps?.listeners && 'cursor-grab active:cursor-grabbing',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onHeaderClick?.(); }}
          disabled={!onHeaderClick}
          className={cn(
            'flex items-center gap-2.5 min-w-0 flex-1 text-left',
            'transition-colors',
            onHeaderClick && 'hover:text-primary cursor-pointer',
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground/70 transition-colors',
              // Wake to identity colour when the ancestor card is hovered.
              hoverIconClass,
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground truncate leading-tight">
              {title}
            </div>
            {subtitle && (
              <div className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
        </button>

        {statusPill && (
          <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            {statusPill}
          </div>
        )}

        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
            title={editLabel}
            aria-label={editLabel}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * G3 Narrative summary panel — computed one-liner shown at the top of each
 * widget body. Bold lead + secondary line, no % duplication (the bar owns
 * the percentage).
 */
export interface NarrativeSummaryProps {
  lead: React.ReactNode;
  secondary?: React.ReactNode;
  /**
   * Health tone drives the accent bar colour on the left of the panel:
   *   'ok'       → muted (default, no alarm)
   *   'attention' → amber (something needs review)
   *   'critical' → red   (overdue / stalled)
   */
  tone?: 'ok' | 'attention' | 'critical';
  onClick?: () => void;
  className?: string;
}

const NARRATIVE_TONE: Record<NonNullable<NarrativeSummaryProps['tone']>, string> = {
  ok: 'border-l-border/60',
  attention: 'border-l-amber-500',
  critical: 'border-l-red-500',
};

export const NarrativeSummary: React.FC<NarrativeSummaryProps> = ({
  lead,
  secondary,
  tone = 'ok',
  onClick,
  className,
}) => {
  const Wrapper: any = onClick ? 'button' : 'div';
  const wrapperProps: any = onClick
    ? { type: 'button', onClick: (e: React.MouseEvent) => { e.stopPropagation(); onClick(); } }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'w-full text-left rounded-md bg-muted/30 border border-border/40 border-l-[3px] px-3 py-2.5',
        NARRATIVE_TONE[tone],
        onClick && 'hover:bg-muted/50 transition-colors cursor-pointer',
        className,
      )}
    >
      <div className="text-[13px] font-semibold text-foreground leading-snug">{lead}</div>
      {secondary && (
        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{secondary}</div>
      )}
    </Wrapper>
  );
};

/**
 * G3 Inline labelled divider — used to introduce a section inside a card
 * body ("Ongoing · 3", "Upcoming · 4", "Team", "Milestones", …). Renders a
 * small uppercase label on the left with a hairline running to the edge.
 */
export const InlineDivider: React.FC<{ label: string; count?: number; className?: string; right?: React.ReactNode }> = ({
  label,
  count,
  className,
  right,
}) => (
  <div className={cn('flex items-center gap-2 py-1', className)}>
    <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground shrink-0">
      {label}
      {typeof count === 'number' && (
        <span className="ml-1.5 text-muted-foreground/70 tabular-nums">· {count}</span>
      )}
    </span>
    <div className="flex-1 h-px bg-border/60" />
    {right && <div className="shrink-0">{right}</div>}
  </div>
);
