import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, LayoutGrid, GanttChart, ArrowLeftRight, Users as UsersIcon, GraduationCap, Wrench, ChevronDown, History } from 'lucide-react';
import { useORPPlanDetails, useORPPlans } from '@/hooks/useORPPlans';
import { Skeleton } from '@/components/ui/skeleton';
import { ORPKanbanBoardDraggable } from './ORPKanbanBoardDraggable';
import { ORPGanttChart } from './ORPGanttChart';
import { ORPApprovalPanel } from './ORPApprovalPanel';
import { ORPResourcesPanel } from './ORPResourcesPanel';
import { ORPExportPDF } from './ORPExportPDF';
import { ORPActivityTimeline } from './ORPActivityTimeline';
import { ORPComparisonView } from './ORPComparisonView';
import { ORPResourceDashboard } from './ORPResourceDashboard';
import { useORPRealtime } from '@/hooks/useORPRealtime';
import { ORATrainingPlanTab } from '@/components/ora/ORATrainingPlanTab';
import { ORAMaintenanceReadinessTab } from '@/components/ora/ORAMaintenanceReadinessTab';
import { ORAHandoverTab } from '@/components/ora/ORAHandoverTab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const ORPDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kanban');
  const [showComparison, setShowComparison] = useState(false);

  const { data: plan, isLoading } = useORPPlanDetails(id || '');
  const { plans: allPlans } = useORPPlans();
  useORPRealtime(id);

  // Get all ORA plans for the same project
  const projectPlans = plan?.project_id 
    ? allPlans?.filter(p => p.project_id === plan.project_id) || []
    : [];

  // Phase order for display
  const phaseOrder: Record<string, number> = {
    'ASSESS_SELECT': 1,
    'DEFINE': 2,
    'EXECUTE': 3
  };

  // Sort project plans by phase order
  const sortedProjectPlans = [...projectPlans].sort(
    (a, b) => (phaseOrder[b.phase] || 0) - (phaseOrder[a.phase] || 0)
  );

  if (isLoading) {
    return (
      <div className="h-screen flex w-full overflow-hidden">
        <OrshSidebar currentPage="operation-readiness" onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else {
            navigate(`/${section}`);
          }
        }} onLogout={() => navigate('/')} />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="h-screen flex w-full overflow-hidden">
        <OrshSidebar currentPage="operation-readiness" onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else {
            navigate(`/${section}`);
          }
        }} onLogout={() => navigate('/')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">ORA Plan not found</p>
        </div>
      </div>
    );
  }

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return 'Assess & Select';
      case 'DEFINE': return 'Define';
      case 'EXECUTE': return 'Execute';
      default: return phase;
    }
  };

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        currentPage="operation-readiness"
        onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else if (section === 'operation-readiness') {
            navigate('/operation-readiness');
          } else {
            navigate(`/${section}`);
          }
        }}
        onLogout={() => navigate('/')}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/operation-readiness')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {plan.project?.project_title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {/* Phase Navigation Dropdown */}
                {sortedProjectPlans.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        {getPhaseLabel(plan.phase)}
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {sortedProjectPlans.map((p) => (
                        <DropdownMenuItem
                          key={p.id}
                          onClick={() => navigate(`/operation-readiness/${p.id}`)}
                          className={p.id === plan.id ? 'bg-accent' : ''}
                        >
                          <div className="flex items-center gap-2">
                            {p.id !== plan.id && <History className="w-3 h-3 text-muted-foreground" />}
                            <span>{getPhaseLabel(p.phase)}</span>
                            {p.id === plan.id && <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge variant="outline">{getPhaseLabel(plan.phase)}</Badge>
                )}
                <Badge>{plan.status.replace('_', ' ')}</Badge>
                <span className="text-sm text-muted-foreground">
                  {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(true)}
                className="gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Compare ORPs
              </Button>
              <ORPExportPDF plan={plan} deliverables={plan.deliverables || []} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-6">
              <TabsList className="flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="gantt" className="gap-2">
                  <GanttChart className="w-4 h-4" />
                  Gantt Chart
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="training" className="gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Training
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="gap-2">
                  <Wrench className="w-4 h-4" />
                  Maintenance
                </TabsTrigger>
                <TabsTrigger value="handover" className="gap-2">
                  <ArrowLeftRight className="w-4 h-4" />
                  Handover
                </TabsTrigger>
                <TabsTrigger value="approvals" className="gap-2">
                  Approvals
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="kanban" className="h-full m-0">
                <ORPKanbanBoardDraggable 
                  planId={plan.id} 
                  deliverables={plan.deliverables || []} 
                />
              </TabsContent>

              <TabsContent value="gantt" className="h-full m-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gantt Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ORPGanttChart deliverables={plan.deliverables || []} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="h-full m-0 p-6">
                <ORPActivityTimeline planId={plan.id} />
              </TabsContent>

              <TabsContent value="training" className="h-full m-0 p-6">
                <ORATrainingPlanTab oraPlanId={plan.id} />
              </TabsContent>

              <TabsContent value="maintenance" className="h-full m-0 p-6">
                <ORAMaintenanceReadinessTab oraPlanId={plan.id} />
              </TabsContent>

              <TabsContent value="handover" className="h-full m-0 p-6">
                <ORAHandoverTab oraPlanId={plan.id} />
              </TabsContent>

              <TabsContent value="approvals" className="h-full m-0 p-6">
                <ORPApprovalPanel planId={plan.id} approvals={plan.approvals || []} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <ORPComparisonView
        open={showComparison}
        onOpenChange={setShowComparison}
      />
    </div>
  );
};
