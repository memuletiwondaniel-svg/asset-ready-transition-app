import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, CalendarCheck, CheckCircle2, Clock, FileEdit, Send, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { ORPGanttChart } from '@/components/orp/ORPGanttChart';
import { ORPApprovalsTab } from '@/components/orp/ORPApprovalsTab';
import { useORPPlanDetails } from '@/hooks/useORPPlans';
import { cn } from '@/lib/utils';
import { parseISO, differenceInDays, isPast } from 'date-fns';

interface ORPGanttOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName?: string;
  planStatus?: string;
  overallProgress: number;
  completedCount: number;
  totalCount: number;
  inProgressCount?: number;
  notStartedCount?: number;
  p2aProgress?: number;
  vcrCount?: number;
  projectCode?: string;
  projectName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: { label: 'Draft', icon: FileEdit, className: 'bg-muted text-muted-foreground border-border' },
  PENDING_APPROVAL: { label: 'Under Review', icon: Send, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

export const ORPGanttOverlay: React.FC<ORPGanttOverlayProps> = ({
  open,
  onOpenChange,
  planId,
  planName,
  planStatus,
  overallProgress,
  completedCount,
  totalCount,
  inProgressCount = 0,
  notStartedCount = 0,
  p2aProgress = 0,
  vcrCount = 0,
  projectCode,
  projectName,
}) => {
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const { data: planDetails, isLoading } = useORPPlanDetails(open ? planId : '');

  const statusConfig = planStatus ? STATUS_CONFIG[planStatus] : null;
  const StatusIcon = statusConfig?.icon || Clock;

  // Compute schedule metrics from deliverables
  const scheduleMetrics = useMemo(() => {
    if (!planDetails?.deliverables) return null;
    const today = new Date();
    const leafActivities = planDetails.deliverables.filter((d: any) => d.start_date && d.end_date);
    if (leafActivities.length === 0) return null;

    let onTrack = 0;
    let atRisk = 0;
    let totalSlippage = 0;
    let overdueCount = 0;

    leafActivities.forEach((d: any) => {
      const endDate = parseISO(d.end_date);
      const isCompleted = d.status === 'COMPLETED';
      const isOverdue = isPast(endDate) && !isCompleted;

      if (isOverdue) {
        atRisk++;
        const slippage = differenceInDays(today, endDate);
        totalSlippage += slippage;
        overdueCount++;
      } else {
        onTrack++;
      }
    });

    const spi = leafActivities.length > 0 ? Math.round((onTrack / leafActivities.length) * 100) : 0;
    const avgSlippage = overdueCount > 0 ? Math.round(totalSlippage / overdueCount) : 0;

    return { spi, atRisk, avgSlippage, total: leafActivities.length };
  }, [planDetails?.deliverables]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                  <CalendarCheck className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-sm font-bold">
                      ORA Plan
                    </DialogTitle>
                    {statusConfig && (
                      <button
                        onClick={() => setApprovalsOpen(true)}
                        className="focus:outline-none"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                            statusConfig.className
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </button>
                    )}
                  </div>
                  <DialogDescription className="sr-only">
                    View ORA Plan schedule and approval status
                  </DialogDescription>
                  {planName && (
                    <p className="text-[11px] text-muted-foreground">{planName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="mt-4 grid grid-cols-[minmax(180px,0.6fr)_auto_auto_auto] gap-2 items-stretch">
              {/* Overall Progress */}
              <div className="p-3 bg-muted/30 rounded-xl border border-border/30 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Overall Progress</span>
                  <span className="font-bold text-sm">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  {completedCount}/{totalCount} done · {inProgressCount} active · {notStartedCount} pending
                  {vcrCount > 0 && ` · P2A ${p2aProgress}%`}
                </p>
              </div>

              {/* SPI */}
              {scheduleMetrics && (
                <>
                   <div className={cn(
                    "flex flex-col items-center justify-center px-2 py-1 rounded-lg border min-w-[56px]",
                    scheduleMetrics.spi >= 80
                      ? "bg-green-500/5 border-green-500/20"
                      : scheduleMetrics.spi >= 50
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-destructive/5 border-destructive/20"
                  )}>
                    {scheduleMetrics.spi >= 50
                      ? <TrendingUp className={cn("h-3 w-3 mb-0.5", scheduleMetrics.spi >= 80 ? "text-green-600" : "text-amber-600")} />
                      : <TrendingDown className="h-3 w-3 mb-0.5 text-destructive" />
                    }
                    <p className={cn(
                      "text-xs font-bold leading-none",
                      scheduleMetrics.spi >= 80 ? "text-green-600" : scheduleMetrics.spi >= 50 ? "text-amber-600" : "text-destructive"
                    )}>{scheduleMetrics.spi}%</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5 font-medium">SPI</p>
                  </div>

                  <div className={cn(
                    "flex flex-col items-center justify-center px-2 py-1 rounded-lg border min-w-[56px]",
                    scheduleMetrics.atRisk === 0
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-destructive/5 border-destructive/20"
                  )}>
                    <AlertTriangle className={cn("h-3 w-3 mb-0.5", scheduleMetrics.atRisk === 0 ? "text-green-600" : "text-destructive")} />
                    <p className={cn(
                      "text-xs font-bold leading-none",
                      scheduleMetrics.atRisk === 0 ? "text-green-600" : "text-destructive"
                    )}>{scheduleMetrics.atRisk}</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5 font-medium">At Risk</p>
                  </div>

                  <div className={cn(
                    "flex flex-col items-center justify-center px-2 py-1 rounded-lg border min-w-[56px]",
                    scheduleMetrics.avgSlippage === 0
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-amber-500/5 border-amber-500/20"
                  )}>
                    <Clock className={cn("h-3 w-3 mb-0.5", scheduleMetrics.avgSlippage === 0 ? "text-green-600" : "text-amber-600")} />
                    <p className={cn(
                      "text-xs font-bold leading-none",
                      scheduleMetrics.avgSlippage === 0 ? "text-green-600" : "text-amber-600"
                    )}>{scheduleMetrics.avgSlippage}d</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5 font-medium">Slippage</p>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-5 pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading Gantt chart...</span>
              </div>
            ) : planDetails?.deliverables && planDetails.deliverables.length > 0 ? (
              <ORPGanttChart
                planId={planId}
                deliverables={planDetails.deliverables}
                hideToolbar
              />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No deliverables to display</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approvals Side Sheet */}
      <Sheet open={approvalsOpen} onOpenChange={setApprovalsOpen}>
        <SheetContent className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Approvals
              {statusConfig && (
                <Badge variant="outline" className={cn("text-[10px] gap-1", statusConfig.className)}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ORPApprovalsTab planId={planId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
