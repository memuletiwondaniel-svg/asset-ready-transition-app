import React, { useState } from 'react';
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
import { ExternalLink, Loader2, CalendarCheck, CheckCircle2, Clock, FileEdit, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ORPGanttChart } from '@/components/orp/ORPGanttChart';
import { ORPApprovalsTab } from '@/components/orp/ORPApprovalsTab';
import { useORPPlanDetails } from '@/hooks/useORPPlans';
import { cn } from '@/lib/utils';

interface ORPGanttOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName?: string;
  planStatus?: string;
  overallProgress: number;
  completedCount: number;
  totalCount: number;
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
}) => {
  const navigate = useNavigate();
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const { data: planDetails, isLoading } = useORPPlanDetails(open ? planId : '');

  const handleViewFullPlan = () => {
    onOpenChange(false);
    navigate(`/operation-readiness/${planId}`);
  };

  const statusConfig = planStatus ? STATUS_CONFIG[planStatus] : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl w-[98vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    ORA Plan
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    View ORA Plan schedule and approval status
                  </DialogDescription>
                  {planName && (
                    <p className="text-xs text-muted-foreground">{planName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Clickable status badge → opens approvals side panel */}
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
                <Button onClick={handleViewFullPlan} size="sm" variant="outline">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View Full Plan
                </Button>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {completedCount} of {totalCount} activities completed
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-5">
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
