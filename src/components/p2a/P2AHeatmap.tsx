import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { P2AHeatmapCell } from './P2AHeatmapCell';
import { ORPPlanDetailDialog } from './ORPPlanDetailDialog';
import { useNavigate } from 'react-router-dom';
import { useORPPlans, useORPDeliverableCategories, useORPHeatmapData, ORPHeatmapCellData } from '@/hooks/useORPHeatmapData';
import { getProjectColor } from '@/utils/projectColors';

export interface ORPCellClickData {
  orpPlanId: string;
  projectId: string;
  categoryId: string;
  categoryName?: string;
  status: string;
  percentage: number;
  deliverableCount?: number;
  completedCount?: number;
  inProgressCount?: number;
  lastUpdated?: string;
  planPhase?: string;
  planStatus?: string;
  projectTitle?: string;
  projectCode?: string;
}

export const P2AHeatmap: React.FC = () => {
  const { plans, isLoading: loadingPlans } = useORPPlans();
  const { categories, isLoading: loadingCategories } = useORPDeliverableCategories();
  const { heatmapData, isLoading: loadingHeatmapData } = useORPHeatmapData();
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<ORPCellClickData | null>(null);

  if (loadingPlans || loadingCategories || loadingHeatmapData) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">P2A Handover Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Get phase label for display
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return 'Assess & Select';
      case 'DEFINE': return 'Define';
      case 'EXECUTE': return 'Execute';
      default: return phase;
    }
  };

  // Get status color for badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500 text-white';
      case 'IN_PROGRESS': return 'bg-amber-500 text-white';
      case 'DRAFT': return 'bg-gray-400 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border-b border-border/40 p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-bold">P2A Handover Heatmap</CardTitle>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-white border border-muted-foreground/30" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 dark:bg-gray-600" />
              <span>On Hold</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Header Row */}
            <div className="flex border-b border-border/40 bg-muted/30">
              <div className="w-36 sm:w-48 p-1.5 sm:p-2 font-semibold text-[10px] sm:text-xs border-r border-border/40 sticky left-0 bg-muted/30 z-10">
                Project
              </div>
              <div className="w-20 sm:w-24 p-1 sm:p-1.5 text-[8px] sm:text-[10px] font-semibold text-center border-r border-border/40">
                Phase
              </div>
              <div className="w-16 sm:w-20 p-1 sm:p-1.5 text-[8px] sm:text-[10px] font-semibold text-center border-r border-border/40">
                Status
              </div>
              <div className="w-14 sm:w-16 p-1 sm:p-1.5 text-[8px] sm:text-[10px] font-semibold text-center border-r border-border/40">
                Progress
              </div>
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className="w-14 sm:w-16 p-1 sm:p-1.5 text-[8px] sm:text-[10px] font-semibold text-center border-r border-border/40 leading-tight"
                  title={category.name}
                >
                  {category.name.length > 15 ? `${category.name.substring(0, 12)}...` : category.name}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {plans?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No ORP plans found. Create your first Operations Readiness Plan to get started.
              </div>
            ) : (
              plans?.map((plan) => {
                const prefix = plan.project?.project_id_prefix || '';
                const number = plan.project?.project_id_number || '';
                const projectColor = getProjectColor(prefix, number);
                
                return (
                <div key={plan.id} className="flex border-b border-border/40 hover:bg-muted/20">
                  <div 
                    className="w-36 sm:w-48 p-1.5 sm:p-2 border-r border-border/40 sticky left-0 bg-card z-10 cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => navigate(`/project/${plan.project_id}`)}
                  >
                    <Badge 
                      variant="outline" 
                      className="text-[10px] sm:text-xs font-semibold px-2 py-1 text-white border-0 mb-0.5 inline-flex items-center justify-center leading-none"
                      style={{ background: `linear-gradient(to right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }}
                    >
                      {prefix}-{number}
                    </Badge>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                      {plan.project?.project_title}
                    </div>
                  </div>

                  {/* Phase Column */}
                  <div className="w-20 sm:w-24 p-1 sm:p-1.5 border-r border-border/40 flex items-center justify-center">
                    <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5">
                      {getPhaseLabel(plan.phase)}
                    </Badge>
                  </div>

                  {/* Status Column */}
                  <div className="w-16 sm:w-20 p-1 sm:p-1.5 border-r border-border/40 flex items-center justify-center">
                    <Badge className={`text-[8px] sm:text-[10px] px-1.5 ${getStatusColor(plan.status)}`}>
                      {plan.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Progress Column */}
                  <div className="w-14 sm:w-16 p-1 sm:p-1.5 border-r border-border/40 flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[10px] sm:text-xs font-semibold">
                      {plan.deliverables_summary.overall_percentage}%
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      {plan.deliverables_summary.completed}/{plan.deliverables_summary.total}
                    </span>
                  </div>

                  {/* Deliverable Category Cells */}
                  {categories?.map((category) => {
                    const cellKey = `${plan.id}-${category.id}`;
                    const cellData = heatmapData.get(cellKey);
                    
                    // Use actual data if available, otherwise show NOT_STARTED
                    const status = cellData?.status || 'NOT_STARTED';
                    const percentage = cellData?.completionPercentage || 0;
                    
                    return (
                      <div
                        key={category.id}
                        className="w-14 sm:w-16 p-1 sm:p-1.5 border-r border-border/40 flex items-center justify-center"
                      >
                        <P2AHeatmapCell 
                          handoverId={plan.id}
                          categoryId={category.id}
                          status={status}
                          percentage={percentage}
                          categoryName={cellData?.categoryName || category.name}
                          lastUpdated={cellData?.lastUpdated}
                          deliverableCount={cellData?.deliverableCount}
                          completedCount={cellData?.completedCount}
                          onCellClick={(data) => {
                            setSelectedCell({
                              orpPlanId: plan.id,
                              projectId: plan.project_id,
                              categoryId: data.categoryId,
                              categoryName: data.categoryName,
                              status: data.status,
                              percentage: data.percentage,
                              deliverableCount: data.deliverableCount,
                              completedCount: data.completedCount,
                              inProgressCount: cellData?.inProgressCount,
                              lastUpdated: data.lastUpdated,
                              planPhase: plan.phase,
                              planStatus: plan.status,
                              projectTitle: plan.project?.project_title,
                              projectCode: `${prefix}-${number}`
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
              })
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>

      <ORPPlanDetailDialog
        open={!!selectedCell}
        onOpenChange={(open) => !open && setSelectedCell(null)}
        cellData={selectedCell}
      />
    </Card>
  );
};
