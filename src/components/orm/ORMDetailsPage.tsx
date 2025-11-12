import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, LayoutGrid, FileText, MessageSquare, ListTodo } from 'lucide-react';
import { useORMPlanDetails } from '@/hooks/useORMPlans';
import { ORMTaskManagement } from './ORMTaskManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { ORMKanbanBoard } from './ORMKanbanBoard';
import { ORMDailyReportsView } from './ORMDailyReportsView';
import { ORMWorkflowPanel } from './ORMWorkflowPanel';
import { ORMDocumentChecklist } from './ORMDocumentChecklist';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Wrench } from 'lucide-react';

export const ORMDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { setBreadcrumbs } = useBreadcrumb();

  const { data: plan, isLoading } = useORMPlanDetails(id || '');

  React.useEffect(() => {
    if (plan) {
      setBreadcrumbs([
        { label: 'Home', path: '/' },
        { label: 'OR Maintenance', path: '/or-maintenance' },
        { label: plan.project?.project_title || 'Details', path: `/or-maintenance/${id}` }
      ]);
    }
  }, [plan, id, setBreadcrumbs]);

  if (isLoading) {
    return (
      <div className="h-screen flex w-full overflow-hidden">
        <OrshSidebar currentPage="or-maintenance" onNavigate={() => {}} />
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
        <OrshSidebar currentPage="or-maintenance" onNavigate={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">ORM plan not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        currentPage="or-maintenance"
        onNavigate={(section) => {
          if (section === 'home') {
            navigate('/');
          } else if (section === 'or-maintenance') {
            navigate('/or-maintenance');
          } else {
            navigate(`/${section}`);
          }
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card px-6 py-4">
          <BreadcrumbNavigation currentPageLabel="OR Maintenance Details" />
          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/or-maintenance')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2 rounded-lg bg-primary/10">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {plan.project?.project_title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{plan.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  Lead: {(plan.orm_lead as any)?.full_name || 'Not assigned'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-6">
              <TabsList>
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Daily Reports
                </TabsTrigger>
                <TabsTrigger value="workflow" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <ListTodo className="w-4 h-4" />
                  Tasks
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="overview" className="h-full m-0">
                <ORMKanbanBoard />
              </TabsContent>

              <TabsContent value="reports" className="h-full m-0 p-6">
                <ORMDailyReportsView planId={plan.id} reports={plan.deliverables?.flatMap((d: any) => d.reports || []) || []} />
              </TabsContent>

              <TabsContent value="workflow" className="h-full m-0 p-6">
                <ORMWorkflowPanel planId={plan.id} deliverables={plan.deliverables || []} />
              </TabsContent>

              <TabsContent value="documents" className="h-full m-0 p-6">
                <ORMDocumentChecklist planId={plan.id} deliverables={plan.deliverables || []} />
              </TabsContent>

              <TabsContent value="tasks" className="h-full m-0 p-6">
                <div className="space-y-6">
                  {plan.deliverables?.map((deliverable: any) => (
                    <div key={deliverable.id}>
                      <h3 className="text-lg font-medium mb-4">
                        {deliverable.deliverable_type.replace(/_/g, ' ')}
                      </h3>
                      <ORMTaskManagement deliverableId={deliverable.id} />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
