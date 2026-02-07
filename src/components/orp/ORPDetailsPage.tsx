import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LayoutGrid, GanttChart, ArrowLeftRight, GraduationCap, Wrench, ChevronDown, History, Download, MoreVertical, CalendarCheck, CheckCircle, Search, Plus, FileText, FolderOpen, DollarSign } from 'lucide-react';
import { useORPPlanDetails, useORPPlans } from '@/hooks/useORPPlans';
import { Skeleton } from '@/components/ui/skeleton';
import { ORPKanbanBoardDraggable } from './ORPKanbanBoardDraggable';
import { ORPGanttChart } from './ORPGanttChart';
import { ORAApprovalsPanel } from '@/components/ora/ORAApprovalsPanel';
import { ORPExportPDF } from './ORPExportPDF';
import { CreateORPModal } from './CreateORPModal';
import { ORPComparisonView } from './ORPComparisonView';
import { useORPRealtime } from '@/hooks/useORPRealtime';
import { ORATrainingPlanTab } from '@/components/ora/ORATrainingPlanTab';
import { ORAMaintenanceReadinessTab } from '@/components/ora/ORAMaintenanceReadinessTab';
import { ORAHandoverTab } from '@/components/ora/ORAHandoverTab';
import { ORAProceduresTab } from '@/components/ora/ORAProceduresTab';
import { ORADocumentationTab } from '@/components/ora/ORADocumentationTab';
import { ORAOwnersCostTab } from '@/components/ora/ORAOwnersCostTab';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const ORPDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { translations: t } = useLanguage();
  const [activeTab, setActiveTab] = useState('activity-plan');
  const [activityView, setActivityView] = useState<'gantt' | 'kanban'>('gantt');
  const [showComparison, setShowComparison] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

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

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return t.assessAndSelect;
      case 'DEFINE': return t.phaseDefine;
      case 'EXECUTE': return t.phaseExecute;
      default: return phase;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t.oraPlanNotFound}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          {/* Breadcrumb Navigation */}
          <BreadcrumbNavigation 
            currentPageLabel={`${plan.project?.project_id_prefix} ${plan.project?.project_id_number}` || t.oraPlan}
            customBreadcrumbs={[
              { label: t.home, path: '/', onClick: () => navigate('/') },
              { label: t.oraPlansTitle, path: '/operation-readiness', onClick: () => navigate('/operation-readiness') }
            ]}
            className="mb-3"
          />
          
          <div className="flex items-start gap-4 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0 mt-0.5">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {plan.project?.project_id_prefix}-{plan.project?.project_id_number}: ORA Plan
              </h1>
              <p className="text-sm text-muted-foreground">
                {plan.project?.project_title}
              </p>
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
                            {p.id === plan.id && <Badge variant="secondary" className="ml-2 text-xs">{t.currentPhase}</Badge>}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge variant="outline">{getPhaseLabel(plan.phase)}</Badge>
                )}
                <Badge variant="secondary" className="font-normal">{plan.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-6">
          <div className="border-b px-6 pb-4 flex items-center justify-between flex-shrink-0">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="activity-plan" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <CalendarCheck className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-blue-500" />
                {t.activityPlan}
              </TabsTrigger>
              <TabsTrigger value="handover" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-cyan-500" />
                P2A Handover
              </TabsTrigger>
              <TabsTrigger value="training" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <GraduationCap className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-emerald-500" />
                {t.training}
              </TabsTrigger>
              <TabsTrigger value="documentation" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <FolderOpen className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-rose-500" />
                {t.documentation}
              </TabsTrigger>
              <TabsTrigger value="procedures" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <FileText className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-purple-500" />
                {t.procedures}
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <Wrench className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-orange-500" />
                {t.orMaintenance}
              </TabsTrigger>
              <TabsTrigger value="owners-cost" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <DollarSign className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-amber-500" />
                Owners Cost
              </TabsTrigger>
              <TabsTrigger value="approvals" className="gap-2 data-[state=active]:bg-muted data-[state=active]:shadow-sm group">
                <CheckCircle className="w-4 h-4 text-muted-foreground group-data-[state=active]:text-green-500" />
                {t.approvals}
              </TabsTrigger>
            </TabsList>
            
            {/* Export Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  {t.export}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const exportBtn = document.getElementById('ora-export-pdf-trigger');
                  if (exportBtn) exportBtn.click();
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  {t.exportOraPlan}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Hidden export trigger */}
            <div className="hidden">
              <ORPExportPDF plan={plan} deliverables={plan.deliverables || []} />
            </div>
          </div>

          <TabsContent value="activity-plan" className="flex-1 m-0 mt-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
            {/* Unified Toolbar: Search, View Toggle, Add Item */}
            <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-4 flex-shrink-0 mt-4">
              {/* Search - flexible width */}
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.searchDeliverables}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Spacer to push view toggle and button to the right */}
              <div className="flex-1" />
              
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={activityView === 'gantt' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivityView('gantt')}
                  className="gap-2"
                >
                  <GanttChart className="w-4 h-4" />
                  {t.gantt}
                </Button>
                <Button
                  variant={activityView === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivityView('kanban')}
                  className="gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  {t.kanban}
                </Button>
              </div>
              
              {/* Add Item - right-most */}
              <Button onClick={() => setShowAddItem(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addItem}
              </Button>
            </div>
            
            {/* Conditional Content */}
            <div className="flex-1 overflow-auto">
              {activityView === 'gantt' ? (
                <div className="p-6">
                  <ORPGanttChart planId={plan.id} deliverables={plan.deliverables || []} searchQuery={searchQuery} hideToolbar />
                </div>
              ) : (
                <ORPKanbanBoardDraggable 
                  planId={plan.id} 
                  deliverables={plan.deliverables || []}
                  searchQuery={searchQuery}
                  hideToolbar
                />
              )}
            </div>
            
            {/* Add ORA Item Modal */}
            {showAddItem && (
              <CreateORPModal
                open={showAddItem}
                onOpenChange={setShowAddItem}
                onSuccess={() => setShowAddItem(false)}
              />
            )}
          </TabsContent>

          <TabsContent value="training" className="flex-1 m-0 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
            <ORATrainingPlanTab oraPlanId={plan.id} />
          </TabsContent>

          <TabsContent value="documentation" className="flex-1 m-0 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
            <ORADocumentationTab oraPlanId={plan.id} />
          </TabsContent>

          <TabsContent value="procedures" className="flex-1 m-0 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
            <ORAProceduresTab oraPlanId={plan.id} />
          </TabsContent>

          <TabsContent value="maintenance" className="flex-1 m-0 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
            <ORAMaintenanceReadinessTab oraPlanId={plan.id} />
          </TabsContent>

          <TabsContent value="handover" className="flex-1 m-0 mt-0 overflow-hidden data-[state=inactive]:hidden">
            <ORAHandoverTab 
              oraPlanId={plan.id}
              projectId={plan.project_id}
              projectName={`${plan.project?.project_id_prefix} ${plan.project?.project_id_number}`}
              projectNumber={plan.project?.project_id_number}
            />
          </TabsContent>

          <TabsContent value="owners-cost" className="flex-1 m-0 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
            <ORAOwnersCostTab oraPlanId={plan.id} />
          </TabsContent>

          <TabsContent value="approvals" className="flex-1 m-0 mt-0 p-6 overflow-auto data-[state=inactive]:hidden">
            <ORAApprovalsPanel planId={plan.id} />
          </TabsContent>
        </Tabs>
      </div>

      <ORPComparisonView
        open={showComparison}
        onOpenChange={setShowComparison}
      />
    </>
  );
};
