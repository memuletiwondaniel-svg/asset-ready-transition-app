import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useORMPlans } from '@/hooks/useORMPlans';
import { CreateORMModal } from './CreateORMModal';
import { Wrench, Plus, Calendar, User, TrendingUp, AlertCircle, BarChart3, UserCog } from 'lucide-react';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Skeleton } from '@/components/ui/skeleton';

export const ORMLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { plans, isLoading } = useORMPlans();
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'OR Maintenance', path: '/or-maintenance' }
    ]);
  }, [setBreadcrumbs]);

  const getDeliverableLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET_REGISTER: 'Asset Register Build',
      PREVENTIVE_MAINTENANCE: 'PM Routine Build',
      BOM_DEVELOPMENT: 'BOM Development',
      OPERATING_SPARES: '2-Year Operating Spares',
      IMS_UPDATE: 'IMS Update',
      PM_ACTIVATION: 'PM Activation'
    };
    return labels[type] || type;
  };

  const getWorkflowStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'In Progress',
      QAQC_REVIEW: 'QA/QC Review',
      LEAD_REVIEW: 'Lead Review',
      CENTRAL_TEAM_REVIEW: 'Central Team Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      IN_PROGRESS: 'bg-blue-500',
      QAQC_REVIEW: 'bg-yellow-500',
      LEAD_REVIEW: 'bg-orange-500',
      CENTRAL_TEAM_REVIEW: 'bg-purple-500',
      APPROVED: 'bg-green-500',
      REJECTED: 'bg-red-500'
    };
    return colors[stage] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="h-screen flex w-full overflow-hidden">
        <OrshSidebar currentPage="or-maintenance" onNavigate={() => {}} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
            </div>
          </div>
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
          } else {
            navigate(`/${section}`);
          }
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card px-6 py-4">
          <BreadcrumbNavigation currentPageLabel="OR Maintenance" />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">OR Maintenance</h1>
                <p className="text-sm text-muted-foreground">
                  CMMS & IMS Development Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/or-maintenance/analytics')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/or-maintenance/resources')}>
                <UserCog className="w-4 h-4 mr-2" />
                Resources
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create ORM
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Active Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plans?.filter(p => p.status === 'ACTIVE').length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  Total Deliverables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans?.reduce((sum, p) => sum + (p.deliverables?.length || 0), 0) || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" />
                  In Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans?.reduce((sum, p) => 
                    sum + (p.deliverables?.filter(d => 
                      ['QAQC_REVIEW', 'LEAD_REVIEW', 'CENTRAL_TEAM_REVIEW'].includes(d.workflow_stage)
                    ).length || 0), 0
                  ) || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Pending Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plans?.reduce((sum, p) => 
                    sum + (p.deliverables?.filter(d => d.workflow_stage === 'IN_PROGRESS' && d.progress_percentage < 100).length || 0), 0
                  ) || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans?.map((plan: any) => (
              <Card
                key={plan.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/or-maintenance/${plan.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {plan.project?.project_title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                      </CardDescription>
                    </div>
                    <Badge variant={plan.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {plan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{plan.overall_progress || 0}%</span>
                    </div>
                    <Progress value={plan.overall_progress || 0} />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Deliverables:</div>
                    <div className="flex flex-wrap gap-1">
                      {plan.deliverables?.slice(0, 3).map((del: any) => (
                        <Badge
                          key={del.id}
                          variant="outline"
                          className={`text-xs ${getStageColor(del.workflow_stage)} text-white border-none`}
                        >
                          {getDeliverableLabel(del.deliverable_type).split(' ')[0]}
                        </Badge>
                      ))}
                      {plan.deliverables?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{plan.deliverables.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{plan.orm_lead?.full_name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!plans || plans.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No ORM plans yet</p>
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First ORM
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CreateORMModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
};
