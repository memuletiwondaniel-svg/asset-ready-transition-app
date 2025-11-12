import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useORMTasks } from '@/hooks/useORMTasks';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ORMTaskManagementProps {
  deliverableId: string;
}

export const ORMTaskManagement: React.FC<ORMTaskManagementProps> = ({ deliverableId }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH'
  });

  const { tasks, isLoading, createTask, updateTask, deleteTask, isCreating } = useORMTasks(deliverableId);
  const { data: users } = useProfileUsers();

  const handleSubmit = () => {
    if (!formData.title || !formData.assigned_to) return;

    createTask({
      deliverable_id: deliverableId,
      ...formData
    });

    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'MEDIUM'
    });
    setIsCreateOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={isCreating || !formData.title || !formData.assigned_to} className="w-full">
                {isCreating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks?.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50">
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {task.assigned_user && (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={(task.assigned_user as any).avatar_url} />
                        <AvatarFallback className="text-xs">
                          {(task.assigned_user as any).full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {(task.assigned_user as any).full_name}
                      </span>
                    </div>
                  )}

                  <Badge className={getStatusColor(task.status)} variant="secondary">
                    {getStatusIcon(task.status)}
                    <span className="ml-1">{task.status.replace('_', ' ')}</span>
                  </Badge>

                  <Badge className={getPriorityColor(task.priority)} variant="secondary">
                    {task.priority}
                  </Badge>

                  {task.due_date && (
                    <span className="text-xs text-muted-foreground">
                      Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                {task.status !== 'COMPLETED' && (
                  <div className="flex gap-2">
                    {task.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTask({ taskId: task.id, updates: { status: 'IN_PROGRESS' } })}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        onClick={() => updateTask({ 
                          taskId: task.id, 
                          updates: { 
                            status: 'COMPLETED',
                            completion_date: new Date().toISOString().split('T')[0]
                          } 
                        })}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {tasks?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tasks yet. Click "Add Task" to create one.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
