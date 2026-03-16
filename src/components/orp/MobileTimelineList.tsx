import React from 'react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, ChevronRight, ChevronDown, ChevronsUpDown, Calendar, Clock } from 'lucide-react';
import { getStatusLabel, getStatusBadgeClasses } from './utils/statusStyles';
import { cn } from '@/lib/utils';

interface FlatRow {
  deliverable: any;
  depth: number;
  hasChildren: boolean;
  activityCode: string;
}

interface MobileTimelineListProps {
  visibleRows: FlatRow[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  expandedCodes: Set<string>;
  toggleExpand: (code: string) => void;
  isAllExpanded: boolean;
  expandAll: () => void;
  collapseAll: () => void;
  openActivitySheet: (deliverable: any) => void;
  getReconciledActivityState: (deliverable: any) => { status: string; completion: number };
}

const PHASE_ACCENT: Record<string, string> = {
  IDN: 'border-l-blue-500',
  ASS: 'border-l-amber-500',
  SEL: 'border-l-emerald-500',
  DEF: 'border-l-teal-500',
  EXE: 'border-l-indigo-500',
  OPR: 'border-l-purple-500',
  VCR: 'border-l-rose-500',
};

function getPhasePrefix(code: string): string {
  if (!code) return '';
  if (code.startsWith('VCR-')) return 'VCR';
  return code.split('-')[0];
}

export const MobileTimelineList: React.FC<MobileTimelineListProps> = ({
  visibleRows,
  searchQuery,
  onSearchChange,
  expandedCodes,
  toggleExpand,
  isAllExpanded,
  expandAll,
  collapseAll,
  openActivitySheet,
  getReconciledActivityState,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Mobile toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={isAllExpanded ? collapseAll : expandAll}
        >
          <ChevronsUpDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-2 space-y-1.5">
        {visibleRows.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No activities found
          </div>
        )}
        {visibleRows.map((row) => {
          const { deliverable, depth, hasChildren, activityCode } = row;
          const prefix = getPhasePrefix(activityCode);
          const accentClass = PHASE_ACCENT[prefix] || 'border-l-primary';
          const reconciled = getReconciledActivityState(deliverable);
          const hasDates = deliverable.start_date && deliverable.end_date;
          const durationDays = hasDates
            ? differenceInDays(parseISO(deliverable.end_date), parseISO(deliverable.start_date))
            : null;
          const isOverdue = hasDates && isPast(parseISO(deliverable.end_date)) && reconciled.status !== 'COMPLETED';
          const isExpanded = expandedCodes.has(activityCode);

          if (hasChildren) {
            // Parent = section header
            return (
              <button
                key={deliverable.id}
                className={cn(
                  "w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg bg-muted/40 border border-border/30 active:bg-muted/60 transition-colors",
                  depth > 0 && "ml-3"
                )}
                style={{ marginLeft: depth > 0 ? depth * 12 : undefined }}
                onClick={() => toggleExpand(activityCode)}
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                }
                <span className="text-xs font-semibold text-foreground truncate flex-1 text-left">
                  {deliverable.deliverable?.name}
                </span>
                {activityCode && (
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {activityCode}
                  </span>
                )}
              </button>
            );
          }

          // Leaf activity = tappable card
          return (
            <button
              key={deliverable.id}
              className={cn(
                "w-full text-left rounded-lg border border-border/40 bg-card p-3 min-h-[48px]",
                "border-l-[3px] active:bg-accent/30 transition-colors",
                accentClass,
                isOverdue && "border-l-destructive"
              )}
              style={{ marginLeft: depth > 0 ? depth * 12 : undefined }}
              onClick={() => openActivitySheet(deliverable)}
            >
              {/* Row 1: code + status */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                  {activityCode || '—'}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-1.5 py-0 h-5 shrink-0", getStatusBadgeClasses(reconciled.status))}
                >
                  {getStatusLabel(reconciled.status)}
                </Badge>
              </div>

              {/* Row 2: name */}
              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 mb-2">
                {deliverable.deliverable?.name}
              </p>

              {/* Row 3: progress bar */}
              <Progress value={reconciled.completion} className="h-1.5 mb-1.5" />

              {/* Row 4: dates + duration */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {hasDates ? (
                    <span className={cn(isOverdue && "text-destructive font-medium")}>
                      {format(parseISO(deliverable.start_date), 'dd MMM')} – {format(parseISO(deliverable.end_date), 'dd MMM')}
                    </span>
                  ) : (
                    <span>No dates</span>
                  )}
                </div>
                {durationDays !== null && (
                  <div className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{durationDays}d</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
