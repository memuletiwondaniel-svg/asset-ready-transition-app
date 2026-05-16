import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, Key, Plus, Star, Settings2, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { AddProjectWizard } from '@/components/project/AddProjectWizard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCanPerformActionsPermission } from '@/hooks/usePermissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { format } from 'date-fns';
import { Users, Calendar, FileText, Building2, MapPin, Target } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatProjectLocation } from '@/utils/projectLocation';
import { useProjectsP2AProgress } from '@/hooks/useProjectsP2AProgress';

// Column visibility configuration — only Scope & Milestone are toggleable now.
interface ColumnVisibility {
  scope: boolean;
  milestone: boolean;
}

interface ProjectsHomePageProps {
  onBack?: () => void;
}

const ProjectsHomePage = ({ onBack }: ProjectsHomePageProps) => {
  const navigate = useNavigate();
  const { translations: t } = useLanguage();
  const { projects, isLoading, deleteProject, isDeleting } = useProjects();
  const { canPerformActions } = useCanPerformActionsPermission();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    scope: false,
    milestone: false,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const queryClient = useQueryClient();

  const getProjectCode = (project: any) => `${project.project_id_prefix}-${project.project_id_number}`;

  // Filter projects, then sort: favorites first (persisted server-side), preserve API order otherwise.
  const filteredProjects = useMemo(() => {
    const list = (projects ?? []).filter(project =>
      project.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${project.project_id_prefix}${project.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.plant_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...list].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return 0;
    });
  }, [projects, searchQuery]);

  // Batch-fetch P2A progress for the visible rows.
  const visibleProjectIds = useMemo(() => filteredProjects.map(p => p.id), [filteredProjects]);
  const { data: progressMap } = useProjectsP2AProgress(visibleProjectIds);


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
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const getProjectColor = (prefix: string, number: string) => {
    // Generate unique hash from project ID
    const str = `${prefix}${number}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    
    // Generate unique subtle HSL color - low saturation for muted look
    const hue = Math.abs(hash) % 360;
    const saturation = 25 + (Math.abs(hash >> 8) % 15); // 25-40% saturation (subtle)
    const lightness = 55 + (Math.abs(hash >> 16) % 10); // 55-65% lightness (muted)
    
    const bgStart = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const bgEnd = `hsl(${hue}, ${saturation + 5}%, ${lightness - 8}%)`;
    const borderColor = `hsl(${hue}, ${saturation - 5}%, ${lightness + 15}%)`;
    
    return { bgStart, bgEnd, borderColor };
  };


  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation 
          currentPageLabel="P2A" 
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: () => navigate('/') }
          ]}
        />
        
        <div className="flex items-center gap-3 mt-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Key className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">P2A Handover</h1>
            <p className="text-sm text-muted-foreground mt-1">Browse and manage Project-to-Asset (P2A) deliverables and Verification Certificate of Readiness (VCRs)</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Search, New Project Button, and View Toggle */}
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
              {/* Column Visibility Toggle - only show in list view */}
              {viewMode === 'list' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={columnVisibility.scope}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, scope: checked }))}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Scope
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={columnVisibility.milestone}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, milestone: checked }))}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Milestone
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={columnVisibility.scope}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, scope: checked }))}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Scope
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="flex gap-1 bg-muted/30 p-1 rounded-lg border border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "h-8 px-2.5",
                    viewMode === 'grid' 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "h-8 px-2.5",
                    viewMode === 'list' 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {canPerformActions && (
                <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Project</span>
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className={viewMode === 'grid' ? 'h-48 rounded-lg' : 'h-20 rounded-lg'} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredProjects.length === 0 && (
            <EmptyState
              icon={Key}
              title={searchQuery ? 'No projects found' : 'No projects yet'}
              description={
                searchQuery
                  ? 'Try adjusting your search query to find what you\'re looking for.'
                  : 'Create your first project to begin managing Verification Certificates of Readiness and track operational milestones.'
              }
              actionLabel={!searchQuery && canPerformActions ? 'Create New Project' : undefined}
              onAction={!searchQuery && canPerformActions ? () => setIsAddModalOpen(true) : undefined}
            />
          )}

          {/* Grid View */}
          {!isLoading && filteredProjects.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const projectColor = getProjectColor(project.project_id_prefix, project.project_id_number);
                
                return (
                  <Card 
                    key={project.id}
                    className="group relative cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    {/* Favorite Star - Top Right */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, project.id, project.is_favorite)}
                      className={`absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full z-20 transition-all duration-200 hover:bg-yellow-500/20 ${
                        project.is_favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star
                        className={`h-5 w-5 transition-all duration-200 ${
                          project.is_favorite
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground hover:text-yellow-400'
                        }`}
                      />
                    </button>

                    {/* Gradient Background Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ background: `linear-gradient(to bottom right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }} />
                    <CardContent className="relative p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-8">
                          <Badge 
                            variant="outline" 
                            className="text-xs font-semibold px-2 py-0.5 mb-2 text-white border-0"
                            style={{ background: `linear-gradient(to right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }}
                          >
                            {project.project_id_prefix}{project.project_id_number}
                          </Badge>
                          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {project.project_title}
                          </h3>
                        </div>
                      </div>

                      {/* Plant Info */}
                      <div className="p-2.5 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plant</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-foreground">
                            {project.plant_name || 'Not assigned'}
                          </span>
                          {project.station_name && (
                            <Badge variant="outline" className="text-xs bg-background/50">
                              {project.station_name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Team Info */}
                      {project.team_count && project.team_count > 0 && (
                        <div className="flex items-center gap-2 py-2 border-t border-border/30">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex items-center gap-1.5 flex-1">
                            {project.team_lead_name && (
                              <>
                                <Avatar className="h-5 w-5 border border-border/50">
                                  <AvatarImage src={project.team_lead_avatar} />
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {project.team_lead_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">
                                  {project.team_lead_name}
                                </span>
                              </>
                            )}
                            {project.team_count > 1 && (
                              <span className="text-xs text-muted-foreground">
                                +{project.team_count - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Upcoming Milestone - replaces Progress bar */}
                      {project.next_milestone_name && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Target className="h-3 w-3 text-primary" />
                          <span className="truncate">{project.next_milestone_name}</span>
                          {project.next_milestone_date && (
                            <span className="text-muted-foreground/70">
                              · {format(new Date(project.next_milestone_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-3">
                          {project.document_count !== undefined && project.document_count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{project.document_count}</span>
                            </div>
                          )}
                          {project.hub_name && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate max-w-[80px]">{project.hub_name}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {project.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Table/List View */}
          {!isLoading && filteredProjects.length > 0 && viewMode === 'list' && (
            <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-5 py-3 bg-muted/40 border-b border-border/60 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-[0.08em]">
                    <div className="w-8 shrink-0" />
                    <div className="w-20 shrink-0">ID</div>
                    <div className="w-[260px] shrink-0">Project Title</div>
                    {columnVisibility.scope && <div className="w-[240px] shrink-0">Scope</div>}
                    {columnVisibility.milestone && <div className="w-52 shrink-0">Milestone</div>}
                    <div className="w-40 shrink-0">Location</div>
                    <div className="w-12 shrink-0" />
                    <div className="w-56 shrink-0">P2A Progress</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-border/60">
                {filteredProjects.map((project) => {
                  const projectColor = getProjectColor(project.project_id_prefix, project.project_id_number);
                  const location = formatProjectLocation({
                    plant_name: project.plant_name,
                    station_name: project.station_name,
                  });
                  const p2a = progressMap?.[project.id];
                  const vcrs = p2a?.vcrs ?? [];
                  const avg = p2a?.avg ?? 0;
                  const completed = p2a?.completed ?? 0;
                  const total = p2a?.total ?? 0;
                  const barColor =
                    avg >= 75 ? 'bg-emerald-500' :
                    avg >= 25 ? 'bg-amber-500' :
                    avg > 0   ? 'bg-rose-500'   : 'bg-muted-foreground/30';

                  return (
                    <div
                      key={project.id}
                      className="group relative flex items-center gap-4 px-5 py-4 cursor-pointer transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-primary/[0.04] hover:via-muted/40 hover:to-transparent hover:shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      {/* Row actions — leading position */}
                      <div className="w-8 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 -ml-1 rounded-md opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 data-[state=open]:opacity-100 data-[state=open]:translate-x-0 transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => handleToggleFavorite(e as any, project.id, project.is_favorite)}
                            >
                              <Star className={cn('h-4 w-4 mr-2', project.is_favorite && 'fill-yellow-400 text-yellow-400')} />
                              {project.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
                            </DropdownMenuItem>
                            {canPerformActions && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete({ id: project.id, title: project.project_title });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete project
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* ID badge */}
                      <div className="w-20 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold px-2.5 py-1 text-white border-0 inline-flex items-center justify-center leading-none transition-all duration-200 ease-out group-hover:shadow-md group-hover:-translate-y-0.5"
                          style={{ background: `linear-gradient(to right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }}
                        >
                          {project.project_id_prefix}-{project.project_id_number}
                        </Badge>
                      </div>

                      {/* Title */}
                      <div className="w-[260px] shrink-0 flex items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {project.project_title}
                        </h3>
                        {project.is_favorite && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                        )}
                      </div>

                      {/* Scope (optional) */}
                      {columnVisibility.scope && (
                        <div className="w-[240px] shrink-0">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {project.project_scope || '—'}
                          </p>
                        </div>
                      )}

                      {/* Milestone (optional) */}
                      {columnVisibility.milestone && (
                        <div className="w-52 shrink-0">
                          {project.next_milestone_name ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-foreground truncate">{project.next_milestone_name}</p>
                                {project.is_scorecard && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                                    Scorecard
                                  </Badge>
                                )}
                              </div>
                              {project.next_milestone_date && (
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(project.next_milestone_date), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No milestones</span>
                          )}
                        </div>
                      )}

                      {/* Location */}
                      <div className="w-40 shrink-0">
                        <span className="text-sm text-foreground truncate">{location}</span>
                      </div>

                      {/* spacer to separate Location from Progress */}
                      <div className="w-12 shrink-0" />

                      {/* P2A Progress — % + chip on top, full-width bar below */}
                      <div className="w-56 shrink-0">
                        {vcrs.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">No VCRs</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-semibold text-foreground tabular-nums">{avg}%</span>
                                {total > 0 && (
                                  <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {completed}/{total} ready
                                  </span>
                                )}
                              </div>
                              {vcrs.length > 1 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                                  {vcrs.length} VCRs
                                </Badge>
                              )}
                            </div>
                            <Progress
                              value={avg}
                              className="h-1.5 w-full"
                              indicatorClassName={barColor}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Add Project Modal */}
      <AddProjectWizard
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Project Confirmation */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete ? (
                <>This will remove <span className="font-medium text-foreground">{projectToDelete.title}</span> from the P2A Handover list. You can restore it from project administration if needed.</>
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
    </div>
  );
};

export default ProjectsHomePage;
