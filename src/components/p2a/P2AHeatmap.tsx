import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { P2AHeatmapCell } from './P2AHeatmapCell';
import { ORPPlanDetailDialog } from './ORPPlanDetailDialog';
import { useNavigate } from 'react-router-dom';
import { useORPPlans, useORPDeliverableCategories, useORPHeatmapData, ORPHeatmapCellData } from '@/hooks/useORPHeatmapData';
import { useProjects } from '@/hooks/useProjects';
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

// Shorten category names for display
const shortenCategoryName = (name: string): string => {
  const abbreviations: Record<string, string> = {
    'Mech Comp (MC)': 'MC',
    'Construction & Commissioning': 'MC',
    'Performance Test': 'Perf Test',
    'Maintenance Readiness': 'Maint Ready',
    'Ready for Start-Up': 'RFSU',
    'Documents': 'Docs',
    'Documentation': 'Docs',
  };
  return abbreviations[name] || name;
};

// Mock projects for demonstration when no real data exists
const generateMockProjects = () => [
  { 
    id: 'mock-1', 
    project_id: 'mock-proj-1',
    phase: 'EXECUTE', 
    status: 'IN_PROGRESS',
    project: { project_id_prefix: 'DP', project_id_number: '217', project_title: 'NRNGL Fire Water System' },
    deliverables_summary: { total: 12, completed: 8, in_progress: 3, not_started: 1, overall_percentage: 67 }
  },
  { 
    id: 'mock-2', 
    project_id: 'mock-proj-2',
    phase: 'EXECUTE', 
    status: 'IN_PROGRESS',
    project: { project_id_prefix: 'DP', project_id_number: '218', project_title: 'KAZ Gas Compression Upgrade' },
    deliverables_summary: { total: 10, completed: 10, in_progress: 0, not_started: 0, overall_percentage: 100 }
  },
  { 
    id: 'mock-3', 
    project_id: 'mock-proj-3',
    phase: 'DEFINE', 
    status: 'DRAFT',
    project: { project_id_prefix: 'DP', project_id_number: '301', project_title: 'Central Processing Facility' },
    deliverables_summary: { total: 8, completed: 2, in_progress: 4, not_started: 2, overall_percentage: 25 }
  },
  { 
    id: 'mock-4', 
    project_id: 'mock-proj-4',
    phase: 'EXECUTE', 
    status: 'COMPLETED',
    project: { project_id_prefix: 'DP', project_id_number: '189', project_title: 'Artawi Power Generation' },
    deliverables_summary: { total: 15, completed: 15, in_progress: 0, not_started: 0, overall_percentage: 100 }
  },
  { 
    id: 'mock-5', 
    project_id: 'mock-proj-5',
    phase: 'ASSESS_SELECT', 
    status: 'IN_PROGRESS',
    project: { project_id_prefix: 'DP', project_id_number: '402', project_title: 'North Field Expansion Phase 2' },
    deliverables_summary: { total: 6, completed: 1, in_progress: 2, not_started: 3, overall_percentage: 17 }
  },
  { 
    id: 'mock-6', 
    project_id: 'mock-proj-6',
    phase: 'EXECUTE', 
    status: 'IN_PROGRESS',
    project: { project_id_prefix: 'CS', project_id_number: '104', project_title: 'South Storage Terminal' },
    deliverables_summary: { total: 11, completed: 5, in_progress: 4, not_started: 2, overall_percentage: 45 }
  },
  { 
    id: 'mock-7', 
    project_id: 'mock-proj-7',
    phase: 'EXECUTE', 
    status: 'IN_PROGRESS',
    project: { project_id_prefix: 'KZ', project_id_number: '055', project_title: 'KAZ Pipeline Integrity' },
    deliverables_summary: { total: 9, completed: 6, in_progress: 2, not_started: 1, overall_percentage: 67 }
  },
];

// Generate mock cell data for demo purposes
const generateMockCellData = (planId: string, categoryId: string, categoryName: string, categoryIndex: number, planIndex: number): ORPHeatmapCellData => {
  // Create varied statuses based on plan and category index
  const seed = (planIndex * 7 + categoryIndex * 13) % 100;
  
  let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  let percentage: number;
  
  if (seed < 25) {
    status = 'NOT_STARTED';
    percentage = 0;
  } else if (seed < 50) {
    status = 'IN_PROGRESS';
    percentage = 20 + (seed % 60);
  } else if (seed < 80) {
    status = 'COMPLETED';
    percentage = 100;
  } else {
    status = 'ON_HOLD';
    percentage = 30 + (seed % 40);
  }
  
  const deliverableCount = 2 + (seed % 5);
  const completedCount = status === 'COMPLETED' ? deliverableCount : Math.floor(deliverableCount * (percentage / 100));
  
  return {
    orpPlanId: planId,
    categoryId: categoryId,
    categoryName: categoryName,
    status,
    completionPercentage: percentage,
    deliverableCount,
    completedCount,
    inProgressCount: status === 'IN_PROGRESS' ? deliverableCount - completedCount : 0,
    lastUpdated: new Date(Date.now() - seed * 86400000).toISOString(),
  };
};

export const P2AHeatmap: React.FC = () => {
  const { plans: realPlans, isLoading: loadingPlans } = useORPPlans();
  const { categories, isLoading: loadingCategories } = useORPDeliverableCategories();
  const { heatmapData, isLoading: loadingHeatmapData } = useORPHeatmapData();
  const { projects: realProjects, isLoading: loadingProjects } = useProjects();
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<ORPCellClickData | null>(null);

  // Convert actual projects to the plan format for display
  const projectsAsPlanFormat = useMemo(() => {
    if (!realProjects || realProjects.length === 0) return [];
    
    return realProjects.map((project, index) => {
      // Generate varied mock progress based on project index
      const seed = (index * 17 + 5) % 100;
      const total = 6 + (seed % 10);
      const completed = Math.floor(total * (seed / 100));
      const inProgress = Math.floor((total - completed) * 0.6);
      const notStarted = total - completed - inProgress;
      const percentage = Math.round((completed / total) * 100);
      
      // Determine phase based on completion
      let phase = 'EXECUTE';
      let status = 'IN_PROGRESS';
      if (percentage === 100) {
        status = 'COMPLETED';
      } else if (percentage < 20) {
        phase = 'DEFINE';
        status = 'DRAFT';
      } else if (percentage < 40) {
        phase = 'ASSESS_SELECT';
      }
      
      return {
        id: `project-${project.id}`,
        project_id: project.id,
        phase,
        status,
        project: {
          project_id_prefix: project.project_id_prefix || 'DP',
          project_id_number: project.project_id_number || '000',
          project_title: project.project_title
        },
        deliverables_summary: {
          total,
          completed,
          in_progress: inProgress,
          not_started: notStarted,
          overall_percentage: percentage
        }
      };
    });
  }, [realProjects]);

  // Use real ORP plans if available, otherwise use actual projects, then fall back to mock data
  const plans = useMemo(() => {
    if (realPlans && realPlans.length > 0) {
      return realPlans;
    }
    if (projectsAsPlanFormat && projectsAsPlanFormat.length > 0) {
      return projectsAsPlanFormat;
    }
    return generateMockProjects();
  }, [realPlans, projectsAsPlanFormat]);

  // Determine data source
  const isMockData = !realPlans?.length && !projectsAsPlanFormat?.length;
  const isUsingProjects = !realPlans?.length && projectsAsPlanFormat?.length > 0;

  if (loadingPlans || loadingCategories || loadingHeatmapData || loadingProjects) {
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
                  {shortenCategoryName(category.name)}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {plans?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No ORP plans found. Create your first Operations Readiness Plan to get started.
              </div>
            ) : (
              plans?.map((plan, planIndex) => {
                const prefix = plan.project?.project_id_prefix || '';
                const number = plan.project?.project_id_number || '';
                const projectColor = getProjectColor(prefix, number);
                
                return (
                <div key={plan.id} className="flex border-b border-border/40 hover:bg-muted/20">
                  <div 
                    className="w-36 sm:w-48 p-1.5 sm:p-2 border-r border-border/40 sticky left-0 bg-card z-10 cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => (isUsingProjects || !isMockData) && navigate(`/project/${plan.project_id}`)}
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
                    <Badge variant="outline" className={`text-[8px] sm:text-[10px] px-1.5 font-normal ${getStatusColor(plan.status)}`}>
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
                  {categories?.map((category, categoryIndex) => {
                    const cellKey = `${plan.id}-${category.id}`;
                    
                    // Use real data if available, otherwise generate mock data
                    let cellData = heatmapData.get(cellKey);
                    if (!cellData && (isMockData || isUsingProjects)) {
                      cellData = generateMockCellData(plan.id, category.id, category.name, categoryIndex, planIndex);
                    }
                    
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
                          categoryName={shortenCategoryName(cellData?.categoryName || category.name)}
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
