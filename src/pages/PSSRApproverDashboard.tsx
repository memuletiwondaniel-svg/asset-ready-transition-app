import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserTasks } from '@/hooks/useUserTasks';
import { useUserOWLItems } from '@/hooks/useUserOWLItems';
import { useProjectsForOWL } from '@/hooks/useOutstandingWorkList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  ListChecks,
  Plus,
  X,
  Loader2,
  Trash2,
  ClipboardList,
  Calendar,
  FileCheck,
  Wrench
} from 'lucide-react';
import { addDays, differenceInDays } from 'date-fns';
import { OrshSidebar } from '@/components/OrshSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { NotificationCenter } from '@/components/NotificationCenter';
import { DraggableTask } from '@/components/DraggableTask';
import { OWLTaskCard } from '@/components/tasks/OWLTaskCard';
import { PSSRTaskCard } from '@/components/tasks/PSSRTaskCard';
import OWLItemDialog from '@/components/handover/OWLItemDialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UserOWLItem } from '@/hooks/useUserOWLItems';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration - OSRH relevant tasks
const MOCK_PSSR_REVIEWS = [
  {
    pssr: {
      id: 'pssr-001',
      pssr_id: 'PSSR-DP300-001',
      pssr_label: 'DP300 HM Additional Compressors',
      project_id: 'DP300',
      project_name: 'NRNGL Phase 3 Expansion',
      asset: 'Gas Processing Unit A',
    },
    approverRole: 'Process Engineering TA',
    pendingSince: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 24,
  },
  {
    pssr: {
      id: 'pssr-002',
      pssr_id: 'PSSR-2024-002',
      pssr_label: 'Utilities System Review',
      project_id: 'UT-2024',
      project_name: 'Utilities Upgrade Project',
      asset: 'Compressor Station B',
    },
    approverRole: 'Technical Safety TA',
    pendingSince: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 18,
  },
  {
    pssr: {
      id: 'pssr-003',
      pssr_id: 'PSSR-2024-003',
      pssr_label: 'Emergency Shutdown System',
      project_id: 'ESD-2024',
      project_name: 'ESD Enhancement Program',
      asset: 'Central Control Room',
    },
    approverRole: 'I&C TA',
    pendingSince: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    itemCount: 12,
  },
];

const MOCK_OWL_ITEMS: UserOWLItem[] = [
  {
    id: 'owl-001',
    item_number: 'OWL-2024-0042',
    project_id: 'proj-001',
    source: 'PUNCHLIST',
    source_id: null,
    title: 'Replace damaged pressure relief valve on V-102',
    description: 'Valve showing signs of corrosion, needs immediate replacement before startup',
    priority: 1,
    status: 'IN_PROGRESS',
    action_party_role_id: null,
    assigned_to: null,
    due_date: addDays(new Date(), 3).toISOString(),
    completed_date: null,
    comments: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: { id: 'proj-001', name: 'NRNGL Phase 3', code: 'DP300' },
    action_role: { id: 'role-001', name: 'Mechanical Engineering' },
  },
  {
    id: 'owl-002',
    item_number: 'OWL-2024-0043',
    project_id: 'proj-002',
    source: 'PAC',
    source_id: null,
    title: 'Complete fire & gas system commissioning documentation',
    description: 'Documentation package required for PAC review',
    priority: 2,
    status: 'OPEN',
    action_party_role_id: null,
    assigned_to: null,
    due_date: addDays(new Date(), 7).toISOString(),
    completed_date: null,
    comments: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: { id: 'proj-002', name: 'Utilities Upgrade', code: 'UT-2024' },
    action_role: { id: 'role-002', name: 'HSE' },
  },
  {
    id: 'owl-003',
    item_number: 'OWL-2024-0044',
    project_id: 'proj-001',
    source: 'PSSR',
    source_id: null,
    title: 'Verify emergency shutdown system interlock logic',
    description: 'ESD logic verification required per PSSR checklist item TI-23',
    priority: 1,
    status: 'OPEN',
    action_party_role_id: null,
    assigned_to: null,
    due_date: addDays(new Date(), 2).toISOString(),
    completed_date: null,
    comments: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: { id: 'proj-001', name: 'NRNGL Phase 3', code: 'DP300' },
    action_role: { id: 'role-003', name: 'Instrumentation & Controls' },
  },
];

const MOCK_CUSTOM_TASKS: any[] = [];

const PSSRApproverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pendingPSSRs, isLoading: isLoadingPSSRs } = usePSSRsAwaitingReview(user?.id);
  const { 
    tasks: dbTasks, 
    loading: isLoadingTasks,
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    bulkUpdateStatus,
    bulkDelete
  } = useUserTasks();
  const {
    items: dbOwlItems,
    isLoading: isLoadingOWL,
    stats: owlStats,
    updateStatus: updateOWLStatus,
    isUpdatingStatus: isUpdatingOWLStatus,
  } = useUserOWLItems();
  const { data: projects } = useProjectsForOWL();
  
  // Combine real data with mock data for demonstration
  const tasks = dbTasks.length > 0 ? dbTasks : MOCK_CUSTOM_TASKS;
  const owlItems = dbOwlItems.length > 0 ? dbOwlItems : MOCK_OWL_ITEMS;
  const pssrReviews = pendingPSSRs?.length ? pendingPSSRs : MOCK_PSSR_REVIEWS;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedOWLItem, setSelectedOWLItem] = useState<UserOWLItem | null>(null);
  const [owlDialogOpen, setOWLDialogOpen] = useState(false);
  
  // Create Task Dialog State
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState('action');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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
    } else if (filterType === 'owl') {
      return []; // OWL handled separately
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
    
    return pssrReviews?.filter(item => {
      const matchesSearch = !searchQuery || 
        item.pssr.pssr_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pssr.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pssr.asset?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];
  }, [pssrReviews, searchQuery, filterType]);

  // Filter OWL items
  const filteredOWLItems = useMemo(() => {
    if (filterType !== 'all' && filterType !== 'owl') return [];
    
    return owlItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [owlItems, searchQuery, filterType]);

  // Stats
  const pssrCount = filteredPSSRs?.length || 0;
  const owlCount = owlItems.length;
  const totalTasks = taskCounts.total + pssrCount + owlCount;

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

  const handleOWLItemClick = (item: UserOWLItem) => {
    setSelectedOWLItem(item);
    setOWLDialogOpen(true);
  };

  const handleOWLDialogClose = (open: boolean) => {
    setOWLDialogOpen(open);
    if (!open) {
      setSelectedOWLItem(null);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task title',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create a task',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('user_tasks').insert({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        type: newTaskType,
        priority: newTaskPriority,
        due_date: newTaskDueDate || null,
        status: 'pending',
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskType('action');
      setNewTaskPriority('Medium');
      setNewTaskDueDate('');
      setShowCreateTaskDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const isLoading = isLoadingPSSRs || isLoadingTasks || isLoadingOWL;
  const hasNoResults = filteredTasks.length === 0 && filteredPSSRs.length === 0 && filteredOWLItems.length === 0;

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
              
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowCreateTaskDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
                <NotificationCenter />
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4">
            {/* Filter Labels */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'all' 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                All ({totalTasks})
              </button>
              <button
                onClick={() => setFilterType('pssr')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'pssr' 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                PSSR Reviews ({pssrCount})
              </button>
              <button
                onClick={() => setFilterType('owl')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  filterType === 'owl' 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                OWL / Punchlists ({owlCount})
              </button>
              <button
                onClick={() => setFilterType('handover')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'handover' 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Handover Reviews ({taskCounts.review})
              </button>
              <button
                onClick={() => setFilterType('others')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterType === 'others' 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Others ({taskCounts.others})
              </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
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
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? 'No tasks match your search.' : 'No pending tasks.'}
                    </p>
                    <Button onClick={() => setShowCreateTaskDialog(true)} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Task
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* PSSR Reviews */}
                  {filteredPSSRs.map((item) => (
                    <PSSRTaskCard
                      key={`pssr-${item.pssr.id}-${item.approverRole}`}
                      pssrId={item.pssr.pssr_id}
                      pssrLabel={item.pssr.pssr_label || item.pssr.asset || 'PSSR Review'}
                      projectId={item.pssr.project_id || 'N/A'}
                      projectName={item.pssr.project_name || ''}
                      itemsAwaitingReview={item.itemCount}
                      pendingSince={item.pendingSince}
                      onClick={() => handleStartReview(item.pssr.id, item.approverRole)}
                    />
                  ))}

                  {/* OWL / Punchlist Items */}
                  {filteredOWLItems.map((item) => (
                    <OWLTaskCard
                      key={`owl-${item.id}`}
                      item={item}
                      onClick={() => handleOWLItemClick(item)}
                      onUpdateStatus={(id, status) => updateOWLStatus({ id, status })}
                      isUpdating={isUpdatingOWLStatus}
                    />
                  ))}

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

      {/* OWL Item Dialog */}
      <OWLItemDialog
        open={owlDialogOpen}
        onOpenChange={handleOWLDialogClose}
        item={selectedOWLItem as any}
        projects={projects || []}
      />

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create New Task
            </DialogTitle>
            <DialogDescription>
              Add a personal task to track your work in OSRH
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input 
                id="task-title" 
                placeholder="e.g., Review DP300 PSSR documentation" 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea 
                id="task-description" 
                placeholder="Add details about what needs to be done..." 
                value={newTaskDescription} 
                onChange={e => setNewTaskDescription(e.target.value)} 
                className="resize-none" 
                rows={3} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-type">Type</Label>
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger id="task-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Approval
                      </div>
                    </SelectItem>
                    <SelectItem value="review">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Review
                      </div>
                    </SelectItem>
                    <SelectItem value="action">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Action
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="Low">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="task-due-date" 
                  type="date" 
                  value={newTaskDueDate} 
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={isCreatingTask || !newTaskTitle.trim()}>
              {isCreatingTask ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default PSSRApproverDashboard;
