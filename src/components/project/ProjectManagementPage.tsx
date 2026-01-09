import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FolderOpen, Users, Calendar, FileText, MoreVertical, Eye, Edit3, Trash2, Folder, Star, GitBranch, Milestone, Layers } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { getCurrentTranslations } from '@/utils/translations';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { supabase } from '@/integrations/supabase/client';
import { CreateProjectWizard } from './CreateProjectWizard';
import { ViewProjectModal } from './ViewProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectCard } from './ProjectCard';
import ProjectHierarchyManagement from '@/components/user-management/ProjectHierarchyManagement';
import { ORPPhaseDeliverablesTab } from './ORPPhaseDeliverablesTab';
import { ProjectMilestonesManagementTab } from './ProjectMilestonesManagementTab';
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
import { ProjectFilters } from './ProjectFilters';
import { OrshSidebar } from '@/components/OrshSidebar';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useProjectPreferences } from '@/hooks/useProjectPreferences';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectManagementPageProps {
  onBack?: () => void;
  selectedLanguage?: string;
  translations?: any;
}

// Sortable Card Component
const SortableProjectCard = ({ project, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectCard {...props} project={project} isDragging={isDragging} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
};

const ProjectManagementPage = ({ onBack, selectedLanguage = 'English', translations }: ProjectManagementPageProps) => {
  const navigate = useNavigate();
  const { projects, isLoading, deleteProject } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const { mutate: logActivity } = useLogActivity();
  const { updateMetadata } = useBreadcrumb();
  const {
    favoriteProjects,
    projectOrder,
    viewMode,
    toggleFavorite,
    updateProjectOrder,
    setViewMode,
  } = useProjectPreferences();
  
  const [activeTab, setActiveTab] = useState('projects');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewProject, setViewProject] = useState<any>(null);
  const [editProject, setEditProject] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('all');
  const [selectedHub, setSelectedHub] = useState('all');
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  
  // Get translations
  const t = translations || getCurrentTranslations(selectedLanguage);

  React.useEffect(() => {
    updateMetadata('title', 'Projects');
  }, [updateMetadata]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch user profile for sidebar
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...(projects || [])];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          `${project.project_id_prefix}${project.project_id_number}`
            .toLowerCase()
            .includes(query) ||
          project.project_title.toLowerCase().includes(query)
      );
    }

    // Apply plant filter
    if (selectedPlant !== 'all') {
      filtered = filtered.filter((project) => project.plant_id === selectedPlant);
    }

    // Apply hub filter
    if (selectedHub !== 'all') {
      filtered = filtered.filter((project) => project.hub_id === selectedHub);
    }

    // Separate favorites and non-favorites
    const favorites = filtered.filter((project) =>
      favoriteProjects.includes(project.id)
    );
    const nonFavorites = filtered.filter(
      (project) => !favoriteProjects.includes(project.id)
    );

    // Sort by custom order if in card view and order exists
    if (viewMode === 'cards' && projectOrder.length > 0) {
      const sortByOrder = (projects: any[]) => {
        return [...projects].sort((a, b) => {
          const aIndex = projectOrder.indexOf(a.id);
          const bIndex = projectOrder.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      };
      return [...sortByOrder(favorites), ...sortByOrder(nonFavorites)];
    }

    // Default: favorites first, then by creation date
    return [
      ...favorites.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      ...nonFavorites.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    ];
  }, [
    projects,
    searchQuery,
    selectedPlant,
    selectedHub,
    favoriteProjects,
    projectOrder,
    viewMode,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredAndSortedProjects.findIndex(
        (p) => p.id === active.id
      );
      const newIndex = filteredAndSortedProjects.findIndex((p) => p.id === over.id);

      const newOrder = arrayMove(
        filteredAndSortedProjects.map((p) => p.id),
        oldIndex,
        newIndex
      );
      updateProjectOrder(newOrder);
    }
  };

  const getProjectId = (project: any) => {
    return `${project.project_id_prefix}${project.project_id_number}`;
  };

  const getStatusBadge = (project: any) => {
    return (
                      <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-200/60">
                        {t.active}
                      </Badge>
    );
  };

  const getPlantName = (plantId: string) => {
    return plants.find(p => p.id === plantId)?.name;
  };

  const getStationName = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.name;
  };

  const getHubName = (hubId: string) => {
    return hubs.find(h => h.id === hubId)?.name;
  };

  const handleDeleteProject = (project: any) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      deleteProject(projectToDelete.id);
      
      // Log activity
      logActivity({
        activityType: 'project_deleted',
        description: `Deleted project: ${projectToDelete.project_id_prefix}${projectToDelete.project_id_number} - ${projectToDelete.project_title}`,
        metadata: {
          project_id: `${projectToDelete.project_id_prefix}${projectToDelete.project_id_number}`,
          project_title: projectToDelete.project_title
        }
      });
      
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPlant('all');
    setSelectedHub('all');
  };

  const hasActiveFilters = Boolean(searchQuery || selectedPlant !== 'all' || selectedHub !== 'all');

  const handleNavigate = (section: string) => {
    if (section === 'home') {
      onBack?.();
    } else if (section === 'projects') {
      // Already on projects page
      return;
    } else {
      // Handle other navigation
      window.location.href = `/${section}`;
    }
  };

  if (isLoading) {
    return (
      <AnimatedBackground>
        <div className="h-screen flex overflow-hidden">
          <OrshSidebar 
            userName={userProfile?.full_name || 'User'}
            userTitle={userProfile?.position || 'Team Member'}
            userAvatar={userProfile?.avatar_url || ''}
            language={selectedLanguage}
            onNavigate={handleNavigate}
            onLogout={onBack}
            currentPage="projects"
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading projects...</div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <div className="h-screen flex overflow-hidden">
        {/* ORSH Sidebar */}
        <OrshSidebar 
          userName={userProfile?.full_name || 'User'}
          userTitle={userProfile?.position || 'Team Member'}
          userAvatar={userProfile?.avatar_url || ''}
          language={selectedLanguage}
          onNavigate={handleNavigate}
          onLogout={onBack}
          currentPage="projects"
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
            <BreadcrumbNavigation currentPageLabel="Projects" />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                  <Folder className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Projects
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and manage all projects
                  </p>
                </div>
              </div>
              
              {activeTab === 'projects' && (
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.createProject || 'Create Project'}
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-6">
                  <TabsTrigger value="projects" className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    Projects
                  </TabsTrigger>
                  <TabsTrigger value="hierarchy" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Hierarchy
                  </TabsTrigger>
                  <TabsTrigger value="orp-phases" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    ORP Phases
                  </TabsTrigger>
                  <TabsTrigger value="milestones" className="flex items-center gap-2">
                    <Milestone className="h-4 w-4" />
                    Milestones
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === 'projects' ? (
                <>
                  {/* Filters */}
                  <ProjectFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedPlant={selectedPlant}
                    onPlantChange={setSelectedPlant}
                    selectedHub={selectedHub}
                    onHubChange={setSelectedHub}
                    plants={plants}
                    hubs={hubs}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onClearFilters={handleClearFilters}
                    hasActiveFilters={hasActiveFilters}
                  />

                  {/* Projects Display */}
                  {filteredAndSortedProjects.length === 0 ? (
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
                      <CardContent className="p-16">
                        <div className="text-center">
                          <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                          <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            {hasActiveFilters ? 'No Projects Match Your Filters' : t.totalProjects || 'No Projects Found'}
                          </h3>
                          <p className="text-gray-500 mb-4">
                            {hasActiveFilters
                              ? 'Try adjusting your search or filter criteria'
                              : t.createProject || 'Get started by creating your first project'}
                          </p>
                          {!hasActiveFilters && (
                            <Button
                              onClick={() => setIsAddModalOpen(true)}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t.createProject}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : viewMode === 'cards' ? (
                    // Card View with Drag and Drop
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={filteredAndSortedProjects.map((p) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="group/cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredAndSortedProjects.map((project, index) => (
                            <SortableProjectCard
                              key={project.id}
                              project={project}
                              plantName={getPlantName(project.plant_id)}
                              stationName={getStationName(project.station_id)}
                              hubName={getHubName(project.hub_id)}
                              isFavorite={favoriteProjects.includes(project.id)}
                              onToggleFavorite={() => toggleFavorite(project.id)}
                              onView={() => {
                                console.log('ProjectManagementPage: onView called for project:', project.id);
                                setViewProject(project);
                              }}
                              onEdit={() => setEditProject(project)}
                              onDelete={() => handleDeleteProject(project)}
                              translations={t}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    // Table View
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
                      <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-blue-100/60">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-blue-900">
                            {t.projectsOverview}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-blue-100/60 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                              <TableHead className="font-semibold text-blue-900 px-6 py-4 w-[50px]"></TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">{t.actions}</TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">Project ID</TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">Project Title</TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">Plant</TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">Hub</TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">{t.active || 'Status'}</TableHead>
                              <TableHead className="font-semibold text-blue-900 px-6 py-4">{t.createdAt}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAndSortedProjects.map((project, index) => (
                              <TableRow
                                key={project.id}
                                onClick={() => navigate(`/project/${project.id}`)}
                                className={`cursor-pointer border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                                  index % 2 === 0 ? 'bg-white/60' : 'bg-blue-50/20'
                                }`}
                              >
                                <TableCell className="px-6 py-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(project.id);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Star
                                      className={`h-4 w-4 transition-all ${
                                        favoriteProjects.includes(project.id)
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-muted-foreground hover:text-yellow-400'
                                      }`}
                                    />
                                  </Button>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border border-gray-200/60">
                                      <DropdownMenuItem
                                        className="flex items-center text-blue-600 hover:bg-blue-50/80"
                                        onClick={() => setViewProject(project)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t.viewDetails}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="flex items-center text-green-600 hover:bg-green-50/80"
                                        onClick={() => setEditProject(project)}
                                      >
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        {t.editProject}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="flex items-center text-red-600 hover:bg-red-50/80"
                                        onClick={() => handleDeleteProject(project)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t.deleteProject}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-100/80 text-blue-700 border-blue-200/60 text-xs font-medium"
                                  >
                                    {getProjectId(project)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{project.project_title}</div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <div className="flex items-center">
                                    <span className="text-gray-700">{getPlantName(project.plant_id) || 'Not assigned'}</span>
                                    {project.station_id && getStationName(project.station_id) && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {getStationName(project.station_id)}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <span className="text-gray-700">{getHubName(project.hub_id) || 'Not assigned'}</span>
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  {getStatusBadge(project)}
                                </TableCell>
                                <TableCell className="px-6 py-4">
                                  <span className="text-gray-600">
                                    {new Date(project.created_at).toLocaleDateString()}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : activeTab === 'hierarchy' ? (
                <ProjectHierarchyManagement 
                  selectedLanguage={selectedLanguage}
                  translations={translations}
                />
              ) : activeTab === 'orp-phases' ? (
                <ORPPhaseDeliverablesTab />
              ) : activeTab === 'milestones' ? (
                <ProjectMilestonesManagementTab />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Add Project Wizard */}
      <CreateProjectWizard 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* View Project Modal */}
      <ViewProjectModal 
        open={!!viewProject}
        onClose={() => setViewProject(null)}
        onEdit={() => {
          setEditProject(viewProject);
          setViewProject(null);
        }}
        project={viewProject}
        plantName={viewProject ? getPlantName(viewProject.plant_id) : undefined}
        stationName={viewProject ? getStationName(viewProject.station_id) : undefined}
        hubName={viewProject ? getHubName(viewProject.hub_id) : undefined}
      />

      {/* Edit Project Modal */}
      <EditProjectModal 
        open={!!editProject}
        onClose={() => setEditProject(null)}
        onSave={(updatedProject) => {
          setEditProject(null);
          setViewProject(updatedProject);
        }}
        project={editProject}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project{' '}
              <span className="font-semibold text-foreground">
                {projectToDelete?.project_id_prefix}{projectToDelete?.project_id_number} - {projectToDelete?.project_title}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatedBackground>
  );
};

export default ProjectManagementPage;