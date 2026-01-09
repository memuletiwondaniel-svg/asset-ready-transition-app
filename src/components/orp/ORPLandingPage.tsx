import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BarChart3, CalendarCheck, Search, Building2, FolderOpen, Calendar, User } from 'lucide-react';
import { CreateORPModal } from '@/components/orp/CreateORPModal';
import { useORPRealtime } from '@/hooks/useORPRealtime';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useProjects } from '@/hooks/useProjects';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { format } from 'date-fns';

export const ORPLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('projects');
  const { setBreadcrumbs } = useBreadcrumb();
  const { plans, isLoading: plansLoading } = useORPPlans();
  const { projects, isLoading: projectsLoading } = useProjects();
  useORPRealtime();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'ORA Plans', path: '/operation-readiness' }
    ]);
  }, [setBreadcrumbs]);

  // Group ORA plans by project
  const projectsWithORAPlans = projects?.filter(project => 
    plans?.some(plan => plan.project_id === project.id)
  ) || [];

  const projectsWithoutORAPlans = projects?.filter(project => 
    !plans?.some(plan => plan.project_id === project.id)
  ) || [];

  const filteredProjectsWithPlans = projectsWithORAPlans.filter(project =>
    project.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${project.project_id_prefix}-${project.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProjectORAPlans = (projectId: string) => {
    return plans?.filter(plan => plan.project_id === projectId) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'PENDING_APPROVAL': return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'APPROVED': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'COMPLETED': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

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
            // Already here
          } else {
            navigate(`/${section}`);
          }
        }}
        onLogout={() => navigate('/')}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <BreadcrumbNavigation currentPageLabel="ORA Plans" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">ORA Plans</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track operation readiness activities
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/operation-readiness/analytics')} variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create New ORA
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 max-w-md"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="projects" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Projects with ORA Plans ({filteredProjectsWithPlans.length})
                </TabsTrigger>
                <TabsTrigger value="all-plans" className="gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  All ORA Plans ({plans?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-6">
                {plansLoading || projectsLoading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="h-32" />
                      </Card>
                    ))}
                  </div>
                ) : filteredProjectsWithPlans.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No projects with ORA plans found</p>
                      <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
                        <Plus className="w-4 h-4" />
                        Create First ORA Plan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredProjectsWithPlans.map((project) => {
                      const projectPlans = getProjectORAPlans(project.id);
                      return (
                        <Card key={project.id} className="hover:border-primary/50 transition-colors">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Building2 className="w-5 h-5 text-primary" />
                                  {project.project_title}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {project.project_id_prefix}-{project.project_id_number}
                                </p>
                              </div>
                              <Badge variant="outline">{projectPlans.length} ORA Plan(s)</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {projectPlans.map((plan) => (
                                <button
                                  key={plan.id}
                                  onClick={() => navigate(`/operation-readiness/${plan.id}`)}
                                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                                >
                                  <div className="flex items-center gap-4">
                                    <Badge variant="secondary">{getPhaseLabel(plan.phase)}</Badge>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <User className="w-3 h-3" />
                                      <span>{plan.ora_engineer?.full_name || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      <span>{format(new Date(plan.created_at), 'MMM dd, yyyy')}</span>
                                    </div>
                                  </div>
                                  <Badge className={getStatusColor(plan.status)}>
                                    {plan.status.replace('_', ' ')}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all-plans" className="mt-6">
                {plansLoading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="h-24" />
                      </Card>
                    ))}
                  </div>
                ) : !plans || plans.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CalendarCheck className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No ORA plans created yet</p>
                      <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
                        <Plus className="w-4 h-4" />
                        Create ORA Plan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {plans
                      .filter(plan => 
                        plan.project?.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        `${plan.project?.project_id_prefix}-${plan.project?.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => navigate(`/operation-readiness/${plan.id}`)}
                          className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {plan.project?.project_title || 'Untitled Project'}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                              </p>
                            </div>
                            <Badge className={getStatusColor(plan.status)}>
                              {plan.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                            <div className="flex items-center gap-1">
                              <CalendarCheck className="w-4 h-4" />
                              <span>{getPhaseLabel(plan.phase)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{plan.ora_engineer?.full_name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(plan.created_at), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <CreateORPModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(planId) => {
          setShowCreateModal(false);
          navigate(`/operation-readiness/${planId}`);
        }}
      />
    </div>
  );
};
