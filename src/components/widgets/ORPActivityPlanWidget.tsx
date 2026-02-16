import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ChevronDown, Loader2, Clock, CheckCircle2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { ORAActivityPlanWizard } from '@/components/ora/wizard/ORAActivityPlanWizard';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ 
  projectId, 
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);
  
  // Get the primary plan (most recent active one)
  const primaryPlan = plans[0];

  // Combine all upcoming activities from all plans
  const allUpcomingActivities = useMemo(() => {
    return plans.flatMap(plan => plan.upcoming_activities || []);
  }, [plans]);

  // Calculate overall stats
  const totalDeliverables = plans.reduce((sum, p) => sum + p.deliverable_count, 0);
  const completedDeliverables = plans.reduce((sum, p) => sum + p.completed_count, 0);
  const overallProgress = totalDeliverables > 0 
    ? Math.round((completedDeliverables / totalDeliverables) * 100) 
    : 0;

  const handleOpenOverlay = () => {
    if (primaryPlan) {
      setOverlayOpen(true);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "h-full transition-all duration-300 group",
          primaryPlan && "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-purple-500/20"
        )}
        onClick={primaryPlan ? handleOpenOverlay : undefined}
      >
        <CardHeader 
          {...dragAttributes} 
          {...dragListeners} 
          className="cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StyledWidgetIcon 
                Icon={CalendarCheck}
                gradientFrom="from-purple-500"
                gradientTo="to-violet-500"
                glowFrom="from-purple-500/40"
                glowTo="to-violet-500/40"
              />
              <span>ORA Activity Plan</span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm font-medium mb-1">No ORA Plan</p>
            <p className="text-xs opacity-70 mb-4">Operation Readiness activities will appear here</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setWizardOpen(true);
              }}
            >
              Create ORA Activity Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart Overlay */}
      {primaryPlan && (
        <ORPGanttOverlay
          open={overlayOpen}
          onOpenChange={setOverlayOpen}
          planId={primaryPlan.id}
          overallProgress={overallProgress}
          completedCount={completedDeliverables}
          totalCount={totalDeliverables}
        />
      )}

      {/* ORA Activity Plan Creation Wizard */}
      <ORAActivityPlanWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
      />
    </>
  );
};
