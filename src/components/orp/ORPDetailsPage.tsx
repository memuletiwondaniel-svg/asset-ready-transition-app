import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, LayoutGrid, GanttChart } from 'lucide-react';
import { useORPPlanDetails } from '@/hooks/useORPPlans';
import { Skeleton } from '@/components/ui/skeleton';
import { ORPKanbanBoard } from './ORPKanbanBoard';
import { ORPGanttChart } from './ORPGanttChart';
import { ORPApprovalPanel } from './ORPApprovalPanel';
import { ORPResourcesPanel } from './ORPResourcesPanel';

export const ORPDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kanban');

  const { data: plan, isLoading } = useORPPlanDetails(id || '');

  if (isLoading) {
    return (
      <div className="h-screen flex w-full overflow-hidden">
        <OrshSidebar currentPage="operation-readiness" onNavigate={() => {}} />
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
        <OrshSidebar currentPage="operation-readiness" onNavigate={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">ORP not found</p>
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
                <Badge variant="outline">{getPhaseLabel(plan.phase)}</Badge>
                <Badge>{plan.status.replace('_', ' ')}</Badge>
                <span className="text-sm text-muted-foreground">
                  {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-6">
              <TabsList>
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Kanban Board
                </TabsTrigger>
                <TabsTrigger value="gantt" className="gap-2">
                  <GanttChart className="w-4 h-4" />
                  Gantt Chart
                </TabsTrigger>
                <TabsTrigger value="resources" className="gap-2">
                  Resources
                </TabsTrigger>
                <TabsTrigger value="approvals" className="gap-2">
                  Approvals
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="kanban" className="h-full m-0">
                <ORPKanbanBoard 
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

              <TabsContent value="resources" className="h-full m-0 p-6">
                <ORPResourcesPanel planId={plan.id} resources={plan.resources || []} />
              </TabsContent>

              <TabsContent value="approvals" className="h-full m-0 p-6">
                <ORPApprovalPanel planId={plan.id} approvals={plan.approvals || []} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
