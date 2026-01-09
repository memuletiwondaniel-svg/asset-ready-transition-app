import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ListChecks, Search, Plus, X, CheckCircle, Trash2, Loader2, MoreVertical
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DraggableTask } from '@/components/DraggableTask';
import { useUserTasks } from '@/hooks/useUserTasks';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface MyTasksPanelProps {
  className?: string;
}

export const MyTasksPanel: React.FC<MyTasksPanelProps> = ({ className }) => {
  const { toast } = useToast();
  
  // State for tasks panel
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'type'>('priority');
  const [taskFilterType, setTaskFilterType] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskAction, setTaskAction] = useState<'complete' | 'dismiss' | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  // Quick task creation
  const [showQuickTaskDialog, setShowQuickTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState('action');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  // Dependency management
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState<string>('');
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>('');

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const {
    tasks,
    dependencies,
    loading: tasksLoading,
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    addDependency,
    removeDependency,
    bulkUpdateStatus,
    bulkDelete
  } = useUserTasks();

  // Calculate task counts by type and detect overdue tasks
  const taskCounts = React.useMemo(() => {
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
    return {
      all: tasks.length,
      approval: tasks.filter(t => t.type === 'approval').length,
      review: tasks.filter(t => t.type === 'review').length,
      action: tasks.filter(t => t.type === 'action').length,
      overdue: overdueTasks.length
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks;

    // Filter by search query
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) || 
        task.description?.toLowerCase().includes(query) || 
        task.type.toLowerCase().includes(query) || 
        task.priority.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (taskFilterType !== 'all') {
      filtered = filtered.filter(task => task.type === taskFilterType);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (taskSortBy === 'priority') {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      } else if (taskSortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (taskSortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });
    return sorted;
  }, [tasks, taskFilterType, taskSortBy, taskSearchQuery]);

  const handleTaskAction = async (taskId: string, action: 'complete' | 'dismiss') => {
    if (action === 'complete') {
      await updateTaskStatus(taskId, 'completed');
    } else {
      await deleteTask(taskId);
    }
    setTaskToDelete(null);
    setTaskAction(null);
    toast({
      title: action === 'complete' ? 'Task completed' : 'Task dismissed',
      description: `Task has been ${action === 'complete' ? 'marked as complete' : 'removed from your list'}`
    });
  };

  const handleCreateQuickTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const { error } = await supabase.from('user_tasks').insert({
        title: newTaskTitle,
        description: newTaskDescription || null,
        type: newTaskType,
        priority: newTaskPriority,
        due_date: newTaskDueDate || null,
        status: 'pending',
        user_id: user.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Task created successfully"
      });

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskType('action');
      setNewTaskPriority('Medium');
      setNewTaskDueDate('');
      setShowQuickTaskDialog(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  };

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredAndSortedTasks.findIndex(t => t.id === active.id);
      const newIndex = filteredAndSortedTasks.findIndex(t => t.id === over.id);
      const reordered = arrayMove(filteredAndSortedTasks, oldIndex, newIndex);
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
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

  const handleManageDependencies = (taskId: string) => {
    setDependencyTaskId(taskId);
    setShowDependencyDialog(true);
  };

  const handleAddDependency = async () => {
    if (dependencyTaskId && dependsOnTaskId) {
      await addDependency(dependencyTaskId, dependsOnTaskId);
      setShowDependencyDialog(false);
      setDependencyTaskId('');
      setDependsOnTaskId('');
    }
  };

  return (
    <>
      <Card className={`glass-panel shadow-xl h-full flex flex-col ${className}`}>
        <div className="border-b border-border/40 py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg flex-shrink-0 relative overflow-hidden">
                <ListChecks className="w-6 h-6 text-white relative z-10" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <CardTitle className="text-2xl font-bold whitespace-nowrap">My Tasks</CardTitle>
                <div className="flex items-center gap-1.5">
                  {taskCounts.overdue > 0 ? (
                    <Badge variant="destructive" className="animate-pulse font-semibold px-2 py-0.5">
                      {taskCounts.overdue} Overdue
                    </Badge>
                  ) : tasks.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold px-2 py-0.5">
                      {tasks.length}
                    </Badge>
                  )}
                  {taskCounts.approval > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {taskCounts.approval} Approval
                    </Badge>
                  )}
                  {taskCounts.review > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {taskCounts.review} Review
                    </Badge>
                  )}
                  {taskCounts.action > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {taskCounts.action} Action
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowQuickTaskDialog(true)} 
                className="h-8 w-8 p-0 hover:bg-primary/10 flex-shrink-0" 
                title="Quick add task"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b border-border/40 p-4 space-y-3 bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search tasks..." 
                value={taskSearchQuery} 
                onChange={e => setTaskSearchQuery(e.target.value)} 
                className="pl-9 h-9 text-sm backdrop-blur-sm bg-background/80 hover:bg-background transition-colors" 
              />
              {taskSearchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                  onClick={() => setTaskSearchQuery('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            <Select value={taskFilterType} onValueChange={setTaskFilterType}>
              <SelectTrigger className="h-9 text-sm w-48 backdrop-blur-sm bg-background/80 hover:bg-background transition-colors">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-background/98">
                <SelectItem value="all">
                  <div className="flex items-center justify-between w-full">
                    <span>All</span>
                    {taskCounts.all > 0 && (
                      <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                        {taskCounts.all}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="approval">
                  <div className="flex items-center justify-between w-full">
                    <span>Approval</span>
                    {taskCounts.approval > 0 && (
                      <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                        {taskCounts.approval}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="review">
                  <div className="flex items-center justify-between w-full">
                    <span>Review</span>
                    {taskCounts.review > 0 && (
                      <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                        {taskCounts.review}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="action">
                  <div className="flex items-center justify-between w-full">
                    <span>Action</span>
                    {taskCounts.action > 0 && (
                      <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                        {taskCounts.action}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={taskSortBy} onValueChange={value => setTaskSortBy(value as 'priority' | 'due_date' | 'type')}>
              <SelectTrigger className="h-9 text-sm w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedTasks.size > 0 && (
          <div className="border-b border-border/40 p-3 bg-primary/5 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectedTasks.size === filteredAndSortedTasks.length} 
                onCheckedChange={handleSelectAll} 
              />
              <span className="text-sm font-medium">
                {selectedTasks.size} task(s) selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkComplete} className="h-8 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete All
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDelete} className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="w-3 h-3 mr-1" />
                Delete All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedTasks(new Set())} className="h-8 text-xs">
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        <CardContent className="flex-1 p-6 overflow-y-auto">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAndSortedTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No tasks found</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
              <SortableContext items={filteredAndSortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedTasks.map(task => (
                    <DraggableTask 
                      key={task.id} 
                      task={task} 
                      isSelected={selectedTasks.has(task.id)} 
                      onSelect={handleTaskSelect} 
                      onComplete={id => {
                        setTaskToDelete(id);
                        setTaskAction('complete');
                      }} 
                      onDismiss={id => {
                        setTaskToDelete(id);
                        setTaskAction('dismiss');
                      }} 
                      onDelete={deleteTask} 
                      onManageDependencies={handleManageDependencies} 
                      allTasks={tasks} 
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Task Action Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={open => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {taskAction === 'complete' ? 'Complete Task' : 'Dismiss Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {taskAction === 'complete' 
                ? 'Are you sure you want to mark this task as completed? This action cannot be undone.' 
                : 'Are you sure you want to dismiss this task? It will be removed from your list.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => taskToDelete && taskAction && handleTaskAction(taskToDelete, taskAction)}>
              {taskAction === 'complete' ? 'Complete' : 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Task Creation Dialog */}
      <Dialog open={showQuickTaskDialog} onOpenChange={setShowQuickTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Quick Task</DialogTitle>
            <DialogDescription>
              Add a new task to your list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input 
                id="task-title" 
                placeholder="Enter task title" 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea 
                id="task-description" 
                placeholder="Enter task description (optional)" 
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
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
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
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input 
                id="task-due-date" 
                type="date" 
                value={newTaskDueDate} 
                onChange={e => setNewTaskDueDate(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuickTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dependency Management Dialog */}
      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Task Dependencies</DialogTitle>
            <DialogDescription>
              Set which task this task depends on (is blocked by)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>This task depends on:</Label>
              <Select value={dependsOnTaskId} onValueChange={setDependsOnTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.filter(t => t.id !== dependencyTaskId).map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title} ({task.priority})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {dependencyTaskId && (
              <div className="space-y-2">
                <Label>Current Dependencies:</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {dependencies.filter(dep => dep.task_id === dependencyTaskId).map(dep => {
                    const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
                    return depTask ? (
                      <div key={dep.id} className="flex items-center justify-between text-sm">
                        <span>{depTask.title}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeDependency(dep.task_id, dep.depends_on_task_id)} 
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null;
                  })}
                  {dependencies.filter(dep => dep.task_id === dependencyTaskId).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">No dependencies yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDependencyDialog(false);
              setDependsOnTaskId('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddDependency} disabled={!dependsOnTaskId}>
              Add Dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
