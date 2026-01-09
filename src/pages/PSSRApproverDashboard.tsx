import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserTasks } from '@/hooks/useUserTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  MapPin,
  ArrowRight,
  FileText,
  ListChecks,
  Plus,
  X,
  Loader2,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { OrshSidebar } from '@/components/OrshSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { NotificationCenter } from '@/components/NotificationCenter';
import { DraggableTask } from '@/components/DraggableTask';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PSSRApproverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pendingPSSRs, isLoading: isLoadingPSSRs } = usePSSRsAwaitingReview(user?.id);
  const { 
    tasks, 
    loading: isLoadingTasks,
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    bulkUpdateStatus,
    bulkDelete
  } = useUserTasks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Calculate task counts by category
  const taskCounts = useMemo(() => {
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    return {
      total: pendingTasks.length,
      review: pendingTasks.filter(t => t.type === 'review').length,
      others: pendingTasks.filter(t => t.type === 'approval' || t.type === 'action').length
    };
  }, [tasks]);

  // Filter custom tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.status !== 'completed');
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) || 
        task.description?.toLowerCase().includes(query)
      );
    }

    if (filterType === 'pssr') {
      return []; // PSSR handled separately
    } else if (filterType === 'handover') {
      filtered = filtered.filter(t => t.type === 'review');
    } else if (filterType === 'others') {
      filtered = filtered.filter(t => t.type === 'approval' || t.type === 'action');
    }

    return filtered;
  }, [tasks, searchQuery, filterType]);

  // Filter PSSRs
  const filteredPSSRs = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'pssr') return [];
    
    return pendingPSSRs?.filter(item => {
      const matchesSearch = !searchQuery || 
        item.pssr.pssr_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pssr.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pssr.asset?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];
  }, [pendingPSSRs, searchQuery, filterType]);

  // Stats
  const pssrCount = pendingPSSRs?.length || 0;
  const totalTasks = taskCounts.total + pssrCount;

  const getPendingBadgeColor = (pendingSince: string) => {
    const days = differenceInDays(new Date(), new Date(pendingSince));
    if (days < 3) return 'bg-muted text-muted-foreground';
    if (days < 7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
  };

  const handleStartReview = (pssrId: string, approverRole: string) => {
    navigate(`/pssr/${pssrId}/review?role=${encodeURIComponent(approverRole)}`);
  };

  const handleSidebarNavigate = (section: string) => {
    const routes: Record<string, string> = {
      'home': '/',
      'pssr': '/pssr',
      'users': '/users',
      'manage-checklist': '/manage-checklist',
      'admin-tools': '/admin-tools',
      'projects': '/projects',
      'project-management': '/project-management',
      'operation-readiness': '/operation-readiness',
      'p2a-handover': '/p2a-handover',
      'or-maintenance': '/or-maintenance',
      'my-tasks': '/my-tasks',
      'pssr-reviews': '/my-tasks',
    };
    const route = routes[section] || `/${section}`;
    navigate(route);
  };

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(t => t.id === active.id);
      const newIndex = filteredTasks.findIndex(t => t.id === over.id);
      const reordered = arrayMove(filteredTasks, oldIndex, newIndex);
      reorderTasks(reordered);
    }
  };

  const handleTaskSelect = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleBulkComplete = async () => {
    await bulkUpdateStatus(Array.from(selectedTasks), 'completed');
    setSelectedTasks(new Set());
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) {
      await bulkDelete(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };

  const isLoading = isLoadingPSSRs || isLoadingTasks;
  const hasNoResults = filteredTasks.length === 0 && filteredPSSRs.length === 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <OrshSidebar 
          onNavigate={handleSidebarNavigate}
          currentPage="my-tasks"
        />
        <SidebarInset className="flex-1">
          {/* Header */}
          <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
            <BreadcrumbNavigation currentPageLabel="My Tasks" />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    View and manage all tasks assigned to you
                  </p>
                </div>
              </div>
              
              <NotificationCenter />
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4">
            {/* Stats Row */}
            <div className="flex items-center gap-6 text-sm">
              <span className="font-medium">
                Total: <span className="text-foreground">{totalTasks}</span>
              </span>
              <span className="text-muted-foreground">
                PSSR Reviews: {pssrCount}
              </span>
              <span className="text-muted-foreground">
                Handover Reviews: {taskCounts.review}
              </span>
              <span className="text-muted-foreground">
                Others: {taskCounts.others}
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pssr">PSSR Reviews</SelectItem>
                  <SelectItem value="handover">Handover Reviews</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedTasks.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{selectedTasks.size} selected</span>
                <Button size="sm" variant="outline" onClick={handleBulkComplete}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTasks(new Set())}>
                  Clear
                </Button>
              </div>
            )}

            {/* Task List */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : hasNoResults ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No tasks match your search.' : 'No pending tasks.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* PSSR Reviews */}
                  {filteredPSSRs.map((item) => {
                    const daysPending = differenceInDays(new Date(), new Date(item.pendingSince));
                    
                    return (
                      <Card 
                        key={`pssr-${item.pssr.id}-${item.approverRole}`} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleStartReview(item.pssr.id, item.approverRole)}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="shrink-0">PSSR</Badge>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{item.pssr.pssr_id}</span>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {item.approverRole}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {item.pssr.project_name || 'No Project'} 
                                {item.pssr.asset && ` • ${item.pssr.asset}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm text-muted-foreground">{item.itemCount} items</span>
                              <Badge variant="outline" className={getPendingBadgeColor(item.pendingSince)}>
                                <Clock className="h-3 w-3 mr-1" />
                                {daysPending === 0 ? 'Today' : `${daysPending}d`}
                              </Badge>
                              <Button size="sm" variant="outline" onClick={(e) => {
                                e.stopPropagation();
                                handleStartReview(item.pssr.id, item.approverRole);
                              }}>
                                Review
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Custom Tasks */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                    <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {filteredTasks.map(task => (
                        <DraggableTask 
                          key={task.id} 
                          task={task} 
                          isSelected={selectedTasks.has(task.id)} 
                          onSelect={handleTaskSelect} 
                          onComplete={(id) => updateTaskStatus(id, 'completed')} 
                          onDismiss={(id) => deleteTask(id)} 
                          onDelete={deleteTask} 
                          onManageDependencies={() => {}} 
                          allTasks={tasks} 
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PSSRApproverDashboard;
