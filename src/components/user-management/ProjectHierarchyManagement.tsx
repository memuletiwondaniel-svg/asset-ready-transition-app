import React, { useState, useMemo } from 'react';
import { useProjectHierarchy, RegionWithHubs, HubWithProjects, Project } from '@/hooks/useProjectHierarchy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddProjectModal } from '@/components/project/AddProjectModal';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  useSensor, 
  useSensors, 
  PointerSensor,
  closestCenter
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Building2, 
  FolderKanban,
  Plus,
  ArrowLeftRight,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  GitBranch,
  LayoutGrid,
  Trash2,
  GripVertical,
  Pencil
} from 'lucide-react';
import { EditProjectModal } from '@/components/project/EditProjectModal';
import { useHubs } from '@/hooks/useHubs';

interface ProjectHierarchyManagementProps {
  selectedLanguage?: string;
  translations?: Record<string, string>;
}

// Draggable Hub Component
const DraggableHub: React.FC<{
  hub: HubWithProjects;
  region: RegionWithHubs;
  isExpanded: boolean;
  onToggle: () => void;
  onMoveHub: (hub: HubWithProjects, region: RegionWithHubs) => void;
  onMoveProject: (project: Project, hub: HubWithProjects) => void;
}> = ({ hub, region, isExpanded, onToggle, onMoveHub, onMoveProject }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: `hub-${hub.id}`,
    data: { type: 'hub', hub, region }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
          <div 
            className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              {hub.projects.length > 0 ? (
                isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )
              ) : (
                <div className="w-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2 flex-1 py-1 px-2 cursor-pointer" onClick={onToggle}>
            <span className="text-sm font-medium text-foreground/80">{hub.name}</span>
            <Badge variant="outline" className="ml-1 text-xs py-0">
              {hub.projects.length} projects
            </Badge>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onMoveHub(hub, region);
              }}
              title="Move to another region"
            >
              <ArrowLeftRight className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="ml-8 border-l border-border/50 pl-2 space-y-0.5">
            {hub.projects.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 px-2">No projects in this hub</p>
            ) : (
              hub.projects.map(project => (
                <DraggableProject 
                  key={project.id} 
                  project={project} 
                  hub={hub}
                  onMove={onMoveProject}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Draggable Project Component
const DraggableProject: React.FC<{
  project: Project;
  hub: HubWithProjects;
  onMove: (project: Project, hub: HubWithProjects) => void;
}> = ({ project, hub, onMove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: `project-${project.id}`,
    data: { type: 'project', project, hub }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const projectId = `${project.projectIdPrefix}${project.projectIdNumber}`;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center rounded-md transition-colors py-1 px-2 hover:bg-accent/50 group"
    >
      <div 
        className="cursor-grab active:cursor-grabbing p-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <span className="text-xs font-mono font-semibold text-primary mr-2">{projectId}</span>
      <span className="text-xs text-muted-foreground font-normal flex-1 truncate">{project.projectTitle}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onMove(project, hub);
        }}
        title="Move to another hub"
      >
        <ArrowLeftRight className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
};

const ProjectHierarchyManagement: React.FC<ProjectHierarchyManagementProps> = ({
  selectedLanguage = 'en',
  translations = {}
}) => {
  const {
    regions,
    unassignedHubs,
    unassignedProjects,
    allHubs,
    isLoading,
    refetch,
    assignHubToRegion,
    moveProjectToHub,
    addRegion,
    updateRegion,
    deleteRegion
  } = useProjectHierarchy();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(new Set());
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionDescription, setNewRegionDescription] = useState('');
  const [showAddRegionDialog, setShowAddRegionDialog] = useState(false);
  const [moveHubDialog, setMoveHubDialog] = useState<{ hub: HubWithProjects; currentRegion: RegionWithHubs } | null>(null);
  const [moveProjectDialog, setMoveProjectDialog] = useState<{ project: Project; currentHub: HubWithProjects } | null>(null);
  const [selectedTargetRegion, setSelectedTargetRegion] = useState<string>('');
  const [selectedTargetHub, setSelectedTargetHub] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deleteRegionDialog, setDeleteRegionDialog] = useState<RegionWithHubs | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddHubDialog, setShowAddHubDialog] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubDescription, setNewHubDescription] = useState('');
  const [newHubRegionId, setNewHubRegionId] = useState<string>('');
  
  // Edit dialogs state
  const [editPortfolioDialog, setEditPortfolioDialog] = useState<RegionWithHubs | null>(null);
  const [editPortfolioName, setEditPortfolioName] = useState('');
  const [editPortfolioDescription, setEditPortfolioDescription] = useState('');
  const [editHubDialog, setEditHubDialog] = useState<HubWithProjects | null>(null);
  const [editHubName, setEditHubName] = useState('');
  const [editHubDescription, setEditHubDescription] = useState('');
  const [editProjectData, setEditProjectData] = useState<Project | null>(null);
  
  // Hubs hook for updating and creating
  const { updateHub, createHub } = useHubs();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize expanded regions when data loads
  React.useEffect(() => {
    if (regions.length > 0 && expandedRegions.size === 0) {
      setExpandedRegions(new Set(regions.map(r => r.id)));
    }
  }, [regions]);

  const toggleRegion = (regionId: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionId)) {
      newExpanded.delete(regionId);
    } else {
      newExpanded.add(regionId);
    }
    setExpandedRegions(newExpanded);
  };

  const toggleHub = (hubId: string) => {
    const newExpanded = new Set(expandedHubs);
    if (newExpanded.has(hubId)) {
      newExpanded.delete(hubId);
    } else {
      newExpanded.add(hubId);
    }
    setExpandedHubs(newExpanded);
  };

  const expandAll = () => {
    setExpandedRegions(new Set(regions.map(r => r.id)));
    const allHubIds = regions.flatMap(r => r.hubs.map(h => h.id));
    setExpandedHubs(new Set(allHubIds));
  };

  const collapseAll = () => {
    setExpandedRegions(new Set());
    setExpandedHubs(new Set());
  };

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return;
    await addRegion(newRegionName.trim(), newRegionDescription.trim() || undefined);
    setNewRegionName('');
    setNewRegionDescription('');
    setShowAddRegionDialog(false);
  };

  const handleAddHub = async () => {
    if (!newHubName.trim() || !newHubRegionId) return;
    try {
      const createdHub = await createHub(newHubName.trim());
      if (createdHub) {
        await assignHubToRegion(createdHub.id, newHubRegionId);
      }
      setNewHubName('');
      setNewHubDescription('');
      setNewHubRegionId('');
      setShowAddHubDialog(false);
    } catch (err) {
      console.error('Error creating hub:', err);
    }
  };

  const handleMoveHub = async () => {
    if (!moveHubDialog || !selectedTargetRegion) return;
    await assignHubToRegion(moveHubDialog.hub.id, selectedTargetRegion);
    setMoveHubDialog(null);
    setSelectedTargetRegion('');
  };

  const handleMoveProject = async () => {
    if (!moveProjectDialog || !selectedTargetHub) return;
    await moveProjectToHub(moveProjectDialog.project.id, selectedTargetHub);
    setMoveProjectDialog(null);
    setSelectedTargetHub('');
  };

  const handleDeleteRegion = async () => {
    if (!deleteRegionDialog) return;
    await deleteRegion(deleteRegionDialog.id);
    setDeleteRegionDialog(null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overId = over.id as string;

    if (activeData?.type === 'hub') {
      // Dragging a hub
      const hub = activeData.hub as HubWithProjects;
      
      // Check if dropped on a region
      if (overId.startsWith('region-')) {
        const targetRegionId = overId.replace('region-', '');
        if (targetRegionId !== hub.regionId) {
          await assignHubToRegion(hub.id, targetRegionId);
        }
      }
    } else if (activeData?.type === 'project') {
      // Dragging a project
      const project = activeData.project as Project;
      
      // Check if dropped on a hub
      if (overId.startsWith('hub-')) {
        const targetHubId = overId.replace('hub-', '');
        if (targetHubId !== project.hubId) {
          await moveProjectToHub(project.id, targetHubId);
        }
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Search results across all hubs
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    
    const results: Array<{
      project: Project;
      hub: HubWithProjects;
      region: RegionWithHubs | null;
    }> = [];
    
    regions.forEach(region => {
      region.hubs.forEach(hub => {
        hub.projects.forEach(project => {
          const projectId = `${project.projectIdPrefix}${project.projectIdNumber}`.toLowerCase();
          const title = project.projectTitle.toLowerCase();
          
          if (projectId.includes(query) || title.includes(query)) {
            results.push({ project, hub, region });
          }
        });
      });
    });
    
    // Also check unassigned projects
    unassignedProjects.forEach(project => {
      const projectId = `${project.projectIdPrefix}${project.projectIdNumber}`.toLowerCase();
      const title = project.projectTitle.toLowerCase();
      
      if (projectId.includes(query) || title.includes(query)) {
        results.push({ 
          project, 
          hub: { id: '', name: 'Unassigned', description: null, regionId: '', displayOrder: 0, projects: [] } as HubWithProjects,
          region: null
        });
      }
    });
    
    return results;
  }, [regions, unassignedProjects, searchQuery]);

  // Filter hierarchy based on search
  const filterHub = (hub: HubWithProjects): boolean => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (hub.name.toLowerCase().includes(query)) return true;
    
    return hub.projects.some(p => 
      p.projectTitle.toLowerCase().includes(query) ||
      `${p.projectIdPrefix}${p.projectIdNumber}`.toLowerCase().includes(query)
    );
  };

  const filterRegion = (region: RegionWithHubs): boolean => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (region.name.toLowerCase().includes(query)) return true;
    if (region.description?.toLowerCase().includes(query)) return true;
    
    return region.hubs.some(filterHub);
  };

  const visibleRegions = useMemo(() => regions.filter(filterRegion), [regions, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Tree View Component
  const TreeView = () => {
    if (regions.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No regions configured yet</p>
          <Button className="mt-4" onClick={() => setShowAddRegionDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Region
          </Button>
        </div>
      );
    }

    // Show search results panel when there are matches
    if (searchQuery && searchQuery.length >= 2 && searchResults.length > 0) {
      return (
        <ScrollArea className="h-[500px]">
          <div className="p-2">
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>Found {searchResults.length} project{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"</span>
            </div>
            <div className="space-y-2">
              {searchResults.map(({ project, hub, region }) => {
                const projectId = `${project.projectIdPrefix}${project.projectIdNumber}`;
                return (
                  <div 
                    key={project.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="font-mono text-primary font-medium">{projectId}</span>
                        </div>
                        <p className="text-sm text-foreground mt-1 truncate">{project.projectTitle}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {region ? (
                            <>
                              <MapPin className="h-3 w-3" />
                              <span>{region.name}</span>
                              <ChevronRight className="h-3 w-3" />
                            </>
                          ) : null}
                          <Building2 className="h-3 w-3" />
                          <span>{hub.name} Hub</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => setMoveProjectDialog({ project, currentHub: hub })}
                        title="Move to another hub"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      );
    }

    if (searchQuery && visibleRegions.length === 0 && searchResults.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No projects match "{searchQuery}"</p>
          <p className="text-xs mt-1">Try searching by project ID (e.g., DP385) or title</p>
        </div>
      );
    }

    return (
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="h-[500px]">
          <div className="space-y-1 p-2">
            {visibleRegions.map(region => {
              const isRegionExpanded = expandedRegions.has(region.id) || !!searchQuery;
              const filteredHubs = region.hubs.filter(filterHub);
              const totalProjects = region.hubs.reduce((sum, h) => sum + h.projects.length, 0);

              return (
                <div key={region.id} className="select-none" id={`region-${region.id}`}>
                  <Collapsible open={isRegionExpanded} onOpenChange={() => toggleRegion(region.id)}>
                    <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          {region.hubs.length > 0 ? (
                            isRegionExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )
                          ) : (
                            <div className="w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2 flex-1 py-1.5 px-2 cursor-pointer" onClick={() => toggleRegion(region.id)}>
                        <span className="text-sm font-semibold uppercase tracking-wide text-foreground">{region.name}</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {region.hubs.length} hubs
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {totalProjects} projects
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive hover:text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteRegionDialog(region);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-4 border-l border-border pl-2 space-y-1">
                        {filteredHubs.map(hub => (
                          <DraggableHub
                            key={hub.id}
                            hub={hub}
                            region={region}
                            isExpanded={expandedHubs.has(hub.id) || !!searchQuery}
                            onToggle={() => toggleHub(hub.id)}
                            onMoveHub={(h, r) => setMoveHubDialog({ hub: h, currentRegion: r })}
                            onMoveProject={(p, h) => setMoveProjectDialog({ project: p, currentHub: h })}
                          />
                        ))}

                        {filteredHubs.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2 px-2">
                            No hubs assigned to this region
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}

            {/* Unassigned Projects */}
            {unassignedProjects.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 px-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Unassigned Projects ({unassignedProjects.length})
                </p>
                {unassignedProjects.map(project => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent/50 group"
                  >
                    <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-mono text-primary">
                      {project.projectIdPrefix}{project.projectIdNumber}
                    </span>
                    <span className="text-sm truncate">{project.projectTitle}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100"
                      onClick={() => setMoveProjectDialog({ 
                        project, 
                        currentHub: { id: '', name: 'Unassigned', projects: [], regionId: '', displayOrder: 0, description: null } 
                      })}
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        <DragOverlay>
          {activeId && activeId.startsWith('hub-') && (
            <div className="bg-background border rounded-md p-2 shadow-lg">
              <Building2 className="h-4 w-4 inline mr-2" />
              Moving hub...
            </div>
          )}
          {activeId && activeId.startsWith('project-') && (
            <div className="bg-background border rounded-md p-2 shadow-lg">
              <FolderKanban className="h-4 w-4 inline mr-2" />
              Moving project...
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  };

  // Columns View Component
  const ColumnsView = () => {
    // Get all projects from all hubs
    const allProjects = useMemo(() => {
      const projects: Array<{ project: Project; hub: HubWithProjects; region: RegionWithHubs | null }> = [];
      regions.forEach(region => {
        region.hubs.forEach(hub => {
          hub.projects.forEach(project => {
            projects.push({ project, hub, region });
          });
        });
      });
      // Add unassigned projects
      unassignedProjects.forEach(project => {
        projects.push({ 
          project, 
          hub: { id: '', name: 'Unassigned', description: null, regionId: '', displayOrder: 0, projects: [] } as HubWithProjects,
          region: null 
        });
      });
      return projects;
    }, [regions, unassignedProjects]);

    // Calculate total counts
    const totalHubs = allHubs.length;
    const totalProjects = allProjects.length;

    return (
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Portfolios Column */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Portfolios
                <Badge variant="secondary" className="ml-1">{regions.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddRegionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              // Filter portfolios - if a project or hub is selected, only show its parent portfolio
              const filteredPortfolios = selectedProject
                ? regions.filter(r => r.hubs.some(h => h.projects.some(p => p.id === selectedProject)))
                : selectedHub 
                  ? regions.filter(r => r.hubs.some(h => h.id === selectedHub))
                  : regions;
              
              if (filteredPortfolios.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No portfolios found
                  </div>
                );
              }
              
              return (
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-2">
                    {filteredPortfolios.map(region => {
                      const isSelected = selectedRegion === region.id;
                      const totalProjects = region.hubs.reduce((sum, h) => sum + h.projects.length, 0);
                      return (
                        <div
                          key={region.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                            isSelected 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-accent border-border'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              // Deselect all selections
                              setSelectedRegion(null);
                              setSelectedHub(null);
                              setSelectedProject(null);
                            } else {
                              // Select this portfolio, clear hub and project selection
                              setSelectedRegion(region.id);
                              setSelectedHub(null);
                              setSelectedProject(null);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{region.name}</span>
                                {isSelected && (
                                  <ChevronRight className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {region.hubs.length} hubs
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {totalProjects} projects
                                </Badge>
                              </div>
                              {region.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {region.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditPortfolioDialog(region);
                                  setEditPortfolioName(region.name);
                                  setEditPortfolioDescription(region.description || '');
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteRegionDialog(region);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              );
            })()}
          </CardContent>
        </Card>

        {/* Hubs Column - Filtered by selected portfolio */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Project Hubs
                {selectedRegion && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {regions.find(r => r.id === selectedRegion)?.name}
                  </Badge>
                )}
                <Badge variant="secondary" className="ml-1">
                  {selectedRegion 
                    ? regions.find(r => r.id === selectedRegion)?.hubs.length || 0
                    : totalHubs
                  }
                </Badge>
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setNewHubRegionId(selectedRegion || '');
                  setShowAddHubDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {!selectedRegion && (
              <p className="text-xs text-muted-foreground mt-1">
                Select a portfolio to filter hubs
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              // Filter hubs based on selected portfolio or project
              let filteredRegions = selectedRegion 
                ? regions.filter(r => r.id === selectedRegion)
                : regions;
              
              // If a project is selected, filter to only show the hub containing that project
              if (selectedProject) {
                filteredRegions = filteredRegions.map(region => ({
                  ...region,
                  hubs: region.hubs.filter(hub => hub.projects.some(p => p.id === selectedProject))
                })).filter(r => r.hubs.length > 0);
              }
              
              const hubCount = filteredRegions.reduce((sum, r) => sum + r.hubs.length, 0);
              
              if (hubCount === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {selectedRegion ? 'No hubs in selected portfolio' : 'No hubs found'}
                  </div>
                );
              }
              
              return (
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-4">
                    {filteredRegions.map(region => {
                      if (region.hubs.length === 0) return null;
                      return (
                        <div key={region.id}>
                          {!selectedRegion && (
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                              {region.name}
                            </p>
                          )}
                          <div className="space-y-2">
                            {region.hubs.map(hub => {
                              const isSelected = selectedHub === hub.id;
                              return (
                                <div
                                  key={hub.id}
                                  className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                                    isSelected 
                                      ? 'bg-primary/10 border-primary' 
                                      : 'hover:bg-accent border-border'
                                  }`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedHub(null);
                                      setSelectedProject(null);
                                    } else {
                                      setSelectedHub(hub.id);
                                      setSelectedRegion(region.id);
                                      setSelectedProject(null);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{hub.name}</span>
                                        {isSelected && (
                                          <ChevronRight className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {hub.projects.length} projects
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditHubDialog(hub);
                                          setEditHubName(hub.name);
                                          setEditHubDescription(hub.description || '');
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMoveHubDialog({ hub, currentRegion: region });
                                        }}
                                      >
                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              );
            })()}
          </CardContent>
        </Card>

        {/* Projects Column - Filtered by selected portfolio and hub */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projects
                {(selectedRegion || selectedHub) && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {selectedHub 
                      ? allHubs.find(h => h.id === selectedHub)?.name
                      : regions.find(r => r.id === selectedRegion)?.name
                    }
                  </Badge>
                )}
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowAddProjectModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {!selectedRegion && !selectedHub && (
              <p className="text-xs text-muted-foreground mt-1">
                Select a portfolio or hub to filter projects
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              // Filter based on selected portfolio and/or hub
              const filteredRegions = selectedRegion 
                ? regions.filter(r => r.id === selectedRegion)
                : regions;
              
              // Get projects with their context
              const filteredProjects: Array<{ project: Project; hub: HubWithProjects; region: RegionWithHubs }> = [];
              filteredRegions.forEach(region => {
                const hubsToShow = selectedHub 
                  ? region.hubs.filter(h => h.id === selectedHub)
                  : region.hubs;
                hubsToShow.forEach(hub => {
                  hub.projects.forEach(project => {
                    filteredProjects.push({ project, hub, region });
                  });
                });
              });
              
              // Also include unassigned projects if no filter
              const showUnassigned = !selectedRegion && !selectedHub && unassignedProjects.length > 0;
              
              if (filteredProjects.length === 0 && !showUnassigned) {
                return (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {selectedRegion || selectedHub ? 'No projects in selection' : 'No projects found'}
                  </div>
                );
              }
              
              return (
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-4">
                    {/* Group by region if no specific selection, otherwise flat list */}
                    {selectedHub ? (
                      // Show only projects from the selected hub
                      <div className="space-y-2">
                        {filteredProjects.map(({ project, hub, region }) => {
                          const isSelected = selectedProject === project.id;
                          return (
                            <div 
                              key={project.id} 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary' 
                                  : 'border-border hover:bg-accent/50'
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedProject(null);
                                } else {
                                  setSelectedProject(project.id);
                                  setSelectedHub(hub.id);
                                  setSelectedRegion(region.id);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-primary">
                                  {project.projectIdPrefix}{project.projectIdNumber}
                                </span>
                                {isSelected && (
                                  <ChevronRight className="h-4 w-4 text-primary" />
                                )}
                                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => { e.stopPropagation(); setEditProjectData(project); }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => { e.stopPropagation(); setMoveProjectDialog({ project, currentHub: hub }); }}
                                  >
                                    <ArrowLeftRight className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {project.projectTitle}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Group by hub when portfolio is selected or show all
                      <>
                        {filteredRegions.map(region => {
                          const hubsWithProjects = region.hubs.filter(h => h.projects.length > 0);
                          if (hubsWithProjects.length === 0) return null;
                          return (
                            <div key={region.id}>
                              {!selectedRegion && (
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
                                  {region.name}
                                </p>
                              )}
                              {hubsWithProjects.map(hub => (
                                <div key={hub.id} className="mb-3">
                                  <p className="text-xs text-muted-foreground mb-1.5 px-1 flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {hub.name}
                                  </p>
                                  <div className="space-y-2">
                                    {hub.projects.map(project => {
                                      const isSelected = selectedProject === project.id;
                                      return (
                                        <div 
                                          key={project.id} 
                                          className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
                                            isSelected 
                                              ? 'bg-primary/10 border-primary' 
                                              : 'border-border hover:bg-accent/50'
                                          }`}
                                          onClick={() => {
                                            if (isSelected) {
                                              setSelectedProject(null);
                                            } else {
                                              setSelectedProject(project.id);
                                              setSelectedHub(hub.id);
                                              setSelectedRegion(region.id);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-sm text-primary">
                                              {project.projectIdPrefix}{project.projectIdNumber}
                                            </span>
                                            {isSelected && (
                                              <ChevronRight className="h-4 w-4 text-primary" />
                                            )}
                                            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                                onClick={(e) => { e.stopPropagation(); setEditProjectData(project); }}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                                onClick={(e) => { e.stopPropagation(); setMoveProjectDialog({ project, currentHub: hub }); }}
                                              >
                                                <ArrowLeftRight className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          <p className="text-sm text-muted-foreground truncate">
                                            {project.projectTitle}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                        {/* Unassigned projects - only when no filter */}
                        {showUnassigned && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Unassigned Projects
                            </p>
                            <div className="space-y-2">
                              {unassignedProjects.map(project => (
                                <div 
                                  key={project.id} 
                                  className="p-3 rounded-lg border border-dashed group hover:bg-accent/50"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-sm text-primary">
                                      {project.projectIdPrefix}{project.projectIdNumber}
                                    </span>
                                    <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => setEditProjectData(project)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => setMoveProjectDialog({ 
                                          project, 
                                          currentHub: { id: '', name: 'Unassigned', projects: [], regionId: '', displayOrder: 0, description: null } 
                                        })}
                                      >
                                        <ArrowLeftRight className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {project.projectTitle}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Manage your project hierarchy: Regions → Hubs → Projects</span>
        </div>
        
        {/* Search Input */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by ID (DP385) or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="tree" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="tree" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Tree View
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Columns View
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        <TabsContent value="tree" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Project Hierarchy
                {searchQuery && (
                  <Badge variant="secondary" className="ml-2">
                    Filtered
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TreeView />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="mt-0">
          <ColumnsView />
        </TabsContent>
      </Tabs>

      {/* Add Region Dialog */}
      <Dialog open={showAddRegionDialog} onOpenChange={setShowAddRegionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="regionName">Region Name</Label>
              <Input
                id="regionName"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                placeholder="e.g., East"
              />
            </div>
            <div>
              <Label htmlFor="regionDescription">Description (optional)</Label>
              <Input
                id="regionDescription"
                value={newRegionDescription}
                onChange={(e) => setNewRegionDescription(e.target.value)}
                placeholder="Description of the region"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRegionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRegion} disabled={!newRegionName.trim()}>
              Add Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Hub Dialog */}
      <Dialog open={!!moveHubDialog} onOpenChange={(open) => !open && setMoveHubDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Hub to Another Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Move <span className="font-medium">{moveHubDialog?.hub.name} Hub</span> from{' '}
              <span className="font-medium">{moveHubDialog?.currentRegion.name}</span> to:
            </p>
            <Select value={selectedTargetRegion} onValueChange={setSelectedTargetRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select target region" />
              </SelectTrigger>
              <SelectContent>
                {regions
                  .filter(r => r.id !== moveHubDialog?.currentRegion.id)
                  .map(region => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveHubDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveHub} disabled={!selectedTargetRegion}>
              Move Hub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Project Dialog */}
      <Dialog open={!!moveProjectDialog} onOpenChange={(open) => !open && setMoveProjectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Project to Another Hub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Move <span className="font-medium">
                {moveProjectDialog?.project.projectIdPrefix}{moveProjectDialog?.project.projectIdNumber} - {moveProjectDialog?.project.projectTitle}
              </span> to:
            </p>
            <Select value={selectedTargetHub} onValueChange={setSelectedTargetHub}>
              <SelectTrigger>
                <SelectValue placeholder="Select target hub" />
              </SelectTrigger>
              <SelectContent>
                {allHubs
                  .filter(h => h.id !== moveProjectDialog?.currentHub.id)
                  .map(hub => (
                    <SelectItem key={hub.id} value={hub.id}>
                      {hub.name} Hub
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveProjectDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveProject} disabled={!selectedTargetHub}>
              Move Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Region Confirmation */}
      <AlertDialog open={!!deleteRegionDialog} onOpenChange={(open) => !open && setDeleteRegionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Region</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <span className="font-medium">{deleteRegionDialog?.name}</span> region?
              {deleteRegionDialog && deleteRegionDialog.hubs.length > 0 && (
                <span className="block mt-2 text-destructive">
                  This region contains {deleteRegionDialog.hubs.length} hub(s). They will become unassigned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRegion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Project Modal */}
      <AddProjectModal 
        open={showAddProjectModal} 
        onClose={() => setShowAddProjectModal(false)} 
      />

      {/* Add Hub Dialog */}
      <Dialog open={showAddHubDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddHubDialog(false);
          setNewHubName('');
          setNewHubDescription('');
          setNewHubRegionId('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Hub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newHubName">Hub Name *</Label>
              <Input
                id="newHubName"
                value={newHubName}
                onChange={(e) => setNewHubName(e.target.value)}
                placeholder="Enter hub name"
              />
            </div>
            <div>
              <Label htmlFor="newHubDescription">Description (optional)</Label>
              <Input
                id="newHubDescription"
                value={newHubDescription}
                onChange={(e) => setNewHubDescription(e.target.value)}
                placeholder="Description of the hub"
              />
            </div>
            <div>
              <Label htmlFor="newHubRegion">Assign to Portfolio *</Label>
              <Select value={newHubRegionId} onValueChange={setNewHubRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddHubDialog(false);
              setNewHubName('');
              setNewHubDescription('');
              setNewHubRegionId('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddHub}
              disabled={!newHubName.trim() || !newHubRegionId}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Hub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Dialog */}
      <Dialog open={!!editPortfolioDialog} onOpenChange={(open) => !open && setEditPortfolioDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editPortfolioName">Portfolio Name</Label>
              <Input
                id="editPortfolioName"
                value={editPortfolioName}
                onChange={(e) => setEditPortfolioName(e.target.value)}
                placeholder="Portfolio name"
              />
            </div>
            <div>
              <Label htmlFor="editPortfolioDescription">Description (optional)</Label>
              <Input
                id="editPortfolioDescription"
                value={editPortfolioDescription}
                onChange={(e) => setEditPortfolioDescription(e.target.value)}
                placeholder="Description of the portfolio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPortfolioDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (editPortfolioDialog && editPortfolioName.trim()) {
                  await updateRegion(editPortfolioDialog.id, {
                    name: editPortfolioName.trim(),
                    description: editPortfolioDescription.trim() || null
                  });
                  setEditPortfolioDialog(null);
                }
              }}
              disabled={!editPortfolioName.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Hub Dialog */}
      <Dialog open={!!editHubDialog} onOpenChange={(open) => !open && setEditHubDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editHubName">Hub Name</Label>
              <Input
                id="editHubName"
                value={editHubName}
                onChange={(e) => setEditHubName(e.target.value)}
                placeholder="Hub name"
              />
            </div>
            <div>
              <Label htmlFor="editHubDescription">Description (optional)</Label>
              <Input
                id="editHubDescription"
                value={editHubDescription}
                onChange={(e) => setEditHubDescription(e.target.value)}
                placeholder="Description of the hub"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHubDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (editHubDialog && editHubName.trim()) {
                  await updateHub(editHubDialog.id, {
                    name: editHubName.trim(),
                    description: editHubDescription.trim() || undefined
                  });
                  setEditHubDialog(null);
                  refetch();
                }
              }}
              disabled={!editHubName.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      {editProjectData && (
        <EditProjectModal 
          open={!!editProjectData}
          onClose={() => setEditProjectData(null)}
          onSave={() => {
            setEditProjectData(null);
            refetch();
          }}
          project={{
            id: editProjectData.id,
            project_id_prefix: editProjectData.projectIdPrefix,
            project_id_number: editProjectData.projectIdNumber,
            project_title: editProjectData.projectTitle,
            hub_id: editProjectData.hubId,
            plant_id: editProjectData.plantId,
            station_id: editProjectData.stationId,
          } as any}
        />
      )}
    </div>
  );
};

export default ProjectHierarchyManagement;
