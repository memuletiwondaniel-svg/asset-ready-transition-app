import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, Loader2, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ORPGanttChart } from '@/components/orp/ORPGanttChart';
import { useORPPlanDetails } from '@/hooks/useORPPlans';

interface ORPGanttOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName?: string;
  overallProgress: number;
  completedCount: number;
  totalCount: number;
}

export const ORPGanttOverlay: React.FC<ORPGanttOverlayProps> = ({
  open,
  onOpenChange,
  planId,
  planName,
  overallProgress,
  completedCount,
  totalCount,
}) => {
  const navigate = useNavigate();
  const { data: planDetails, isLoading } = useORPPlanDetails(open ? planId : '');

  const handleViewFullPlan = () => {
    onOpenChange(false);
    navigate(`/operation-readiness/${planId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                <CalendarCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  ORA Activity Plan
                </DialogTitle>
                {planName && (
                  <p className="text-xs text-muted-foreground">{planName}</p>
                )}
              </div>
            </div>
            <Button onClick={handleViewFullPlan} size="sm" variant="outline">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Full Plan
            </Button>
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
            <div className="border rounded-lg overflow-hidden">
              <ORPGanttChart
                planId={planId}
                deliverables={planDetails.deliverables}
                hideToolbar
              />
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No deliverables to display</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
