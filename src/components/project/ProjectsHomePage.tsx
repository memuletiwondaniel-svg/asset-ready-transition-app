import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, KeyRound, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/useProjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { CreateProjectWizard } from '@/components/project/CreateProjectWizard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCanPerformActionsPermission } from '@/hooks/usePermissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProjectsP2AProgress } from '@/hooks/useProjectsP2AProgress';
import { ProjectsTable, PROJECTS_TABLE_PREFS_KEY, PROJECTS_TABLE_DEFAULTS } from '@/components/project/ProjectsTable';
import { ProjectColumnsMenu } from '@/components/project/ProjectColumnsMenu';
import { useTablePreferences } from '@/hooks/useTablePreferences';
import { P2AHeatmap } from '@/components/p2a/P2AHeatmap';
import { ProjectQualificationsSheet } from '@/components/p2a/ProjectQualificationsSheet';
import type { Project } from '@/hooks/useProjects';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatProjectLocation } from '@/utils/projectLocation';
import { getMockProgress, projectCode } from '@/lib/p2aMockData';

interface ProjectsHomePageProps {
  onBack?: () => void;
}

const ProjectsHomePage = ({ onBack: _onBack }: ProjectsHomePageProps) => {
  const navigate = useNavigate();
  useLanguage();
  const { projects, isLoading, deleteProject, isDeleting } = useProjects();
  const { canPerformActions } = useCanPerformActionsPermission();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'heatmap' | 'list'>('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const [qualProject, setQualProject] = useState<Project | null>(null);
  const queryClient = useQueryClient();
  const { prefs: tablePrefs, setPrefs: setTablePrefs, reset: resetTablePrefs } = useTablePreferences(
    PROJECTS_TABLE_PREFS_KEY,
    PROJECTS_TABLE_DEFAULTS,
  );

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (projects ?? []).filter((project) => {
      if (!q) return true;
      const code = `${project.project_id_prefix}-${project.project_id_number}`.toLowerCase();
      const codeNoDash = `${project.project_id_prefix}${project.project_id_number}`.toLowerCase();
      const loc = formatProjectLocation({ plant_name: project.plant_name, station_name: project.station_name }).toLowerCase();
      const haystack = [
        project.project_title,
        code,
        codeNoDash,
        loc,
        project.plant_name,
        project.station_name,
        project.hub_name,
        project.team_lead_name,
        project.project_scope,
        project.next_milestone_name,
      ]
        .filter(Boolean)
        .join(' \u00b7 ')
        .toLowerCase();
      return haystack.includes(q);
    });
    return [...list].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return 0;
    });
  }, [projects, searchQuery]);

  const visibleProjectIds = useMemo(() => filteredProjects.map(p => p.id), [filteredProjects]);
  const { data: progressMap } = useProjectsP2AProgress(visibleProjectIds);

  // Merge mock progress for demo projects (DP-317, DP-385) so the UI shows
  // meaningful progress + qualification counts without DB seeding.
  const mergedProgressMap = useMemo(() => {
    const out = { ...(progressMap ?? {}) };
    filteredProjects.forEach((p) => {
      const mock = getMockProgress(projectCode(p));
      if (mock) out[p.id] = mock;
    });
    return out;
  }, [progressMap, filteredProjects]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, projectId: string, currentValue: boolean | null) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_favorite: !currentValue })
        .eq('id', projectId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(currentValue ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorite status');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation
          currentPageLabel="P2A"
          customBreadcrumbs={[{ label: 'Home', path: '/', onClick: () => navigate('/') }]}
        />
        <div className="flex items-center gap-3 mt-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
            <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">P2A Handover</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage Project-to-Asset (P2A) Handover & Deliverables</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'list' ? 'heatmap' : 'list')}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label={viewMode === 'list' ? 'Switch to heatmap view' : 'Switch to list view'}
                      >
                        {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {viewMode === 'list' ? 'Switch to heatmap view' : 'Switch to list view'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>



                {viewMode === 'list' && (
                  <ProjectColumnsMenu prefs={tablePrefs} setPrefs={setTablePrefs} reset={resetTablePrefs} />
                )}

                {canPerformActions && (
                  <Button
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="gap-2 h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New Project</span>
                  </Button>
                )}
              </div>
            </div>

            {isLoading && (
              <div className={viewMode === 'heatmap' ? 'space-y-2' : 'space-y-3'}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            )}

            {!isLoading && filteredProjects.length === 0 && (
              <EmptyState
                icon={KeyRound}
                title={searchQuery ? 'No projects found' : 'No projects yet'}
                description={
                  searchQuery
                    ? "Try adjusting your search query to find what you're looking for."
                    : 'Create your first project to begin managing Verification Certificates of Readiness and track operational milestones.'
                }
                actionLabel={!searchQuery && canPerformActions ? 'Create New Project' : undefined}
                onAction={!searchQuery && canPerformActions ? () => setIsAddModalOpen(true) : undefined}
              />
            )}

            {!isLoading && filteredProjects.length > 0 && viewMode === 'heatmap' && (
              <P2AHeatmap projects={filteredProjects} onProjectClick={handleProjectClick} />
            )}

            {!isLoading && filteredProjects.length > 0 && viewMode === 'list' && (
              <ProjectsTable
                projects={filteredProjects}
                progressMap={mergedProgressMap}
                canPerformActions={canPerformActions}
                onProjectClick={handleProjectClick}
                onToggleFavorite={handleToggleFavorite}
                onDelete={setProjectToDelete}
                onOpenQualifications={setQualProject}
                prefs={tablePrefs}
                setPrefs={setTablePrefs}
              />
            )}
          </div>
        </main>
      </div>

      <CreateProjectWizard open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete ? (
                <>
                  This will remove <span className="font-medium text-foreground">{projectToDelete.title}</span> from the P2A Handover list. You can restore it from project administration if needed.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (projectToDelete) {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProjectQualificationsSheet
        open={!!qualProject}
        onOpenChange={(o) => !o && setQualProject(null)}
        project={qualProject}
      />
    </div>
  );
};

export default ProjectsHomePage;
