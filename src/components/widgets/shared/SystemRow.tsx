import React, { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface SystemRowProps {
  systemCode: string;
  name: string;
  isHydrocarbon?: boolean;
  hasSubsystems?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onRemove?: () => void;
  /** 'p2a' | 'vcr' — only changes downstream-impact wording in the confirm dialog. */
  target?: 'p2a' | 'vcr';
  /** Rendered indented below the row when expanded. */
  children?: React.ReactNode;
}

const DOWNSTREAM_NOTE: Record<NonNullable<SystemRowProps['target']>, string> = {
  p2a:
    'Removing this system unlinks it from any VCRs, items, training, procedures, and W&H Points that reference it in this plan.',
  vcr:
    'Removing this system will unlink it from any VCR items, training, procedures, and W&H Points that reference it.',
};

/**
 * Shared calm row used by both P2A "Select Systems" and VCR "Systems" steps.
 * Faint divider, no card; chevron only when subsystems exist; HC chip only when HC.
 */
export const SystemRow: React.FC<SystemRowProps> = ({
  systemCode,
  name,
  isHydrocarbon = false,
  hasSubsystems = false,
  expanded = false,
  onToggleExpand,
  onRemove,
  target = 'p2a',
  children,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const interactive = hasSubsystems && !!onToggleExpand;

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <div
        className={cn(
          'group flex items-center gap-2 py-2 px-2 rounded-sm transition-colors',
          'hover:bg-muted/30',
          interactive && 'cursor-pointer'
        )}
        onClick={interactive ? onToggleExpand : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleExpand?.();
                }
              }
            : undefined
        }
      >
        {/* Chevron — only when subsystems exist; reserve slot for alignment otherwise */}
        {hasSubsystems ? (
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200',
              expanded && 'rotate-90'
            )}
          />
        ) : (
          <span className="w-3.5 shrink-0" aria-hidden />
        )}

        {/* System code chip — monospaced muted */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums tracking-tight shrink-0 leading-none border border-border/60 bg-muted/40 text-muted-foreground max-w-[180px] truncate">
          {systemCode}
        </span>

        {/* System name */}
        <span className="text-sm text-foreground truncate flex-1 min-w-0">
          {name}
        </span>

        {/* HC chip — only when hydrocarbon */}
        {isHydrocarbon && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-300/70 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300 shrink-0">
                  HC
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Hydrocarbon service.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Trash — red on hover */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            aria-label={`Remove ${systemCode}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Subsystem slot (expanded) */}
      {expanded && hasSubsystems && children && (
        <div className="ml-5 pl-3 border-l border-border/40 pb-2">
          {children}
        </div>
      )}

      {/* Canonical delete confirmation */}
      {onRemove && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent
            className="z-[300]"
            overlayClassName="z-[299] bg-black/70 backdrop-blur-sm"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remove {systemCode} — {name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {DOWNSTREAM_NOTE[target]}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false);
                  onRemove();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export interface SystemsListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container for SystemRow children — faint-divider list, no per-row cards.
 */
export const SystemsList: React.FC<SystemsListProps> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-md border border-border/60 bg-card/40 divide-y divide-border/40',
      className
    )}
  >
    {children}
  </div>
);
