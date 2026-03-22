import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Plus, CalendarCheck, Search, Calendar } from 'lucide-react';
import { CreateORPModal } from '@/components/orp/CreateORPModal';
import { useORPRealtime } from '@/hooks/useORPRealtime';
import { GlossaryTerm } from '@/components/ui/GlossaryTerm';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { format } from 'date-fns';
import { getProjectColor } from '@/utils/projectColors';
export const ORPLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setBreadcrumbs } = useBreadcrumb();
  const { translations: t } = useLanguage();
  const { plans, isLoading } = useORPPlans();
  useORPRealtime();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'ORA Plans', path: '/operation-readiness' }
    ]);
  }, [setBreadcrumbs]);

  // Phase order for sorting (higher = more recent)
  const phaseOrder: Record<string, number> = {
    'ASSESS_SELECT': 1,
    'DEFINE': 2,
    'EXECUTE': 3
  };

  // Derive unique projects directly from plans data (eliminates useProjects dependency)
  const projectsWithORAPlans = useMemo(() => {
    if (!plans) return [];
    
    const projectMap = new Map<string, {
      id: string;
      project_title: string;
      project_id_prefix: string;
      project_id_number: string;
    }>();
    
    plans.forEach(plan => {
      if (plan.project && !projectMap.has(plan.project_id)) {
        projectMap.set(plan.project_id, {
          id: plan.project_id,
          project_title: plan.project.project_title,
          project_id_prefix: plan.project.project_id_prefix,
          project_id_number: plan.project.project_id_number,
        });
      }
    });
    
    return Array.from(projectMap.values());
  }, [plans]);

  // Filter by search query
  const filteredProjects = projectsWithORAPlans.filter(project =>
    project.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${project.project_id_prefix}-${project.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Dynamic skeleton count based on cached data
  const skeletonCount = Math.min(Math.max(plans?.length || 3, 2), 6);

  // Get the most recent phase ORA plan for a project
  const getMostRecentPlan = (projectId: string) => {
    const projectPlans = plans?.filter(plan => plan.project_id === projectId) || [];
    if (projectPlans.length === 0) return null;
    
    return projectPlans.sort((a, b) => {
      const phaseCompare = (phaseOrder[b.phase] || 0) - (phaseOrder[a.phase] || 0);
      if (phaseCompare !== 0) return phaseCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0];
  };

  // Get count of phases for a project
  const getPhaseCount = (projectId: string) => {
    return plans?.filter(plan => plan.project_id === projectId).length || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'PENDING_APPROVAL': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'APPROVED': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'COMPLETED': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return t.assessAndSelect || 'Assess & Select';
      case 'DEFINE': return t.phaseDefine || 'Define';
      case 'EXECUTE': return t.phaseExecute || 'Execute';
      default: return phase;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
      case 'DEFINE': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300';
      case 'EXECUTE': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const handleProjectClick = (projectId: string) => {
    const mostRecentPlan = getMostRecentPlan(projectId);
    if (mostRecentPlan) {
      navigate(`/operation-readiness/${mostRecentPlan.id}`);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel="ORA Plans" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t.oraPlansTitle || 'ORA Plans'}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.oraPlansSubtitle || 'Manage and track operation readiness activities'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search Bar with New ORA Plan Button */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.searchProjects || 'Search projects...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {filteredProjects.length} {t.projectsWithORAPlans || 'projects with ORA plans'}
                </p>
                <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm">
                  <Plus className="w-4 h-4" />
                  {t.createNewORA || 'New ORA Plan'}
                </Button>
              </div>
            </div>

            {/* Project Cards Grid */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
                          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex gap-2">
                        <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                        <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-4 w-full bg-muted animate-pulse rounded" />
                        <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
                      </div>
                      <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarCheck className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? (t.noMatchSearch || 'No projects match your search') : (t.noORAPlansYet || 'No ORA plans created yet')}
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    {t.createORAPlan || 'Create ORA Plan'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => {
                  const mostRecentPlan = getMostRecentPlan(project.id);
                  const phaseCount = getPhaseCount(project.id);
                  if (!mostRecentPlan) return null;

                  return (
                    <Card 
                      key={project.id} 
                      className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <Badge 
                              variant="outline" 
                              className="text-xs font-semibold px-2.5 py-1 text-white border-0 inline-flex items-center justify-center leading-none mb-2"
                              style={{ 
                                background: `linear-gradient(to right, ${getProjectColor(project.project_id_prefix, project.project_id_number).bgStart}, ${getProjectColor(project.project_id_prefix, project.project_id_number).bgEnd})` 
                              }}
                            >
                              {project.project_id_prefix}-{project.project_id_number}
                            </Badge>
                            <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                              {project.project_title}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Current Phase & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={getPhaseColor(mostRecentPlan.phase)}>
                            <CalendarCheck className="w-3 h-3 mr-1" />
                            {getPhaseLabel(mostRecentPlan.phase)}
                          </Badge>
                          <Badge className={getStatusColor(mostRecentPlan.status)}>
                            {mostRecentPlan.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t.progress || 'Progress'}</span>
                            <span className="font-medium">{mostRecentPlan.overall_progress || 0}%</span>
                          </div>
                          <Progress value={mostRecentPlan.overall_progress || 0} className="h-2" indicatorClassName="bg-muted-foreground/40" />
                        </div>
                        
                        {/* Phase count & Date */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                          <span>
                            {phaseCount} {t.phasesAvailable || 'phases available'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{format(new Date(mostRecentPlan.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
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
    </>
  );
};
