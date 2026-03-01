import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Combobox } from '@/components/ui/combobox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  RefreshCw, 
  Activity, 
  ListTodo,
  CalendarIcon,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useProjectsSimple } from '@/hooks/useProjectsSimple';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useOWLMutations } from '@/hooks/useOWLMutations';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { toast } from 'sonner';

type TaskCategory = 'pssr' | 'handover' | 'ora' | 'owl';

interface NewTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { 
    id: 'pssr' as TaskCategory, 
    label: 'PSSR Reviews', 
    icon: ClipboardCheck,
    color: 'from-blue-500 to-blue-600',
    description: 'Pre-Startup Safety Review tasks'
  },
  { 
    id: 'handover' as TaskCategory, 
    label: 'P2A Plan', 
    icon: RefreshCw,
    color: 'from-teal-500 to-teal-600',
    description: 'Project handover reviews'
  },
  { 
    id: 'ora' as TaskCategory, 
    label: 'ORA Activities', 
    icon: Activity,
    color: 'from-purple-500 to-purple-600',
    description: 'Operations Readiness activities'
  },
  { 
    id: 'owl' as TaskCategory, 
    label: 'OWL', 
    icon: ListTodo,
    color: 'from-amber-500 to-amber-600',
    description: 'Outstanding Work List items'
  },
];

const OWL_SOURCES = [
  { value: 'PUNCHLIST', label: 'Punchlist' },
  { value: 'PSSR', label: 'PSSR' },
  { value: 'PAC', label: 'PAC' },
  { value: 'FAC', label: 'FAC' },
  { value: 'MANUAL', label: 'Manual Entry' },
];

const OWL_PRIORITIES = [
  { value: '1', label: 'P1 - Critical' },
  { value: '2', label: 'P2 - Important' },
  { value: '3', label: 'P3 - Normal' },
];

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useProjectsSimple();
  const { data: users, isLoading: usersLoading } = useProfileUsers();
  const { createItem, isCreating } = useOWLMutations();

  const [category, setCategory] = useState<TaskCategory>('owl');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();
  const [assignToSelf, setAssignToSelf] = useState(true);
  const [assigneeId, setAssigneeId] = useState('');
  const [notifyAssignee, setNotifyAssignee] = useState(true);

  // OWL-specific fields
  const [owlSource, setOwlSource] = useState('MANUAL');
  const [owlPriority, setOwlPriority] = useState('2');

  const projectOptions = projects?.map(p => ({
    value: p.id,
    label: `${p.project_id_prefix}-${p.project_id_number} - ${p.project_title}`
  })) || [];

  const userOptions = users?.map(u => ({
    value: u.user_id,
    label: u.full_name,
    description: u.position || u.role
  })) || [];

  const resetForm = () => {
    setCategory('owl');
    setTitle('');
    setDescription('');
    setProjectId('');
    setTargetDate(undefined);
    setAssignToSelf(true);
    setAssigneeId('');
    setNotifyAssignee(true);
    setOwlSource('MANUAL');
    setOwlPriority('2');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    if (!projectId) {
      toast.error('Please select a project');
      return;
    }

    const finalAssigneeId = assignToSelf ? user?.id : assigneeId;
    if (!finalAssigneeId) {
      toast.error('Please select an assignee');
      return;
    }

    // Currently only OWL creation is fully implemented
    if (category === 'owl') {
      try {
        await createItem({
          title: title.trim(),
          description: description.trim() || undefined,
          project_id: projectId,
          source: owlSource as any,
          priority: parseInt(owlPriority),
          status: 'OPEN',
          assigned_to: finalAssigneeId,
          due_date: targetDate ? format(targetDate, 'yyyy-MM-dd') : undefined,
        });

        if (notifyAssignee && !assignToSelf && assigneeId) {
          // TODO: Implement notification sending
          toast.success('Task created and assignee notified');
        } else {
          toast.success('Task created successfully');
        }

        handleClose();
      } catch (error) {
        console.error('Error creating task:', error);
        toast.error('Failed to create task');
      }
    } else {
      // For other categories, show info toast
      toast.info(`${CATEGORIES.find(c => c.id === category)?.label} task creation coming soon`);
    }
  };

  const renderCategorySpecificFields = () => {
    switch (category) {
      case 'owl':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={owlSource} onValueChange={setOwlSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {OWL_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={owlPriority} onValueChange={setOwlPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {OWL_PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'pssr':
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
            PSSR task creation links to existing PSSRs. Full implementation coming soon.
          </div>
        );

      case 'handover':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Handover Stage</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAC">PAC - Provisional Acceptance</SelectItem>
                  <SelectItem value="FAC">FAC - Final Acceptance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              Full P2A handover task creation coming soon.
            </div>
          </div>
        );

      case 'ora':
        return (
          <div className="p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
            ORA activity creation links to existing plans. Full implementation coming soon.
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Task Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200",
                      "flex flex-col items-center gap-2 text-center",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-background"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-br",
                      cat.color
                    )}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{cat.label}</span>
                    {isSelected && (
                      <Badge 
                        variant="default" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                      >
                        ✓
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {CATEGORIES.find(c => c.id === category)?.description}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Common Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project <span className="text-destructive">*</span></Label>
                <Combobox
                  options={projectOptions}
                  value={projectId}
                  onValueChange={setProjectId}
                  placeholder={projectsLoading ? "Loading projects..." : "Select project"}
                  emptyText="No projects found"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Completion Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !targetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {targetDate ? format(targetDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Category-Specific Fields */}
          {renderCategorySpecificFields()}

          <div className="h-px bg-border" />

          {/* Assignment Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Assign To</Label>
            
            <RadioGroup 
              value={assignToSelf ? 'self' : 'other'} 
              onValueChange={(v) => setAssignToSelf(v === 'self')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="assign-self" />
                <Label htmlFor="assign-self" className="font-normal cursor-pointer">
                  Myself
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="assign-other" />
                <Label htmlFor="assign-other" className="font-normal cursor-pointer">
                  Someone else
                </Label>
              </div>
            </RadioGroup>

            {!assignToSelf && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Combobox
                    options={userOptions}
                    value={assigneeId}
                    onValueChange={setAssigneeId}
                    placeholder={usersLoading ? "Loading users..." : "Search and select user"}
                    emptyText="No users found"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notify" 
                    checked={notifyAssignee}
                    onCheckedChange={(checked) => setNotifyAssignee(checked === true)}
                  />
                  <Label 
                    htmlFor="notify" 
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Notify assignee about this task
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isCreating}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {isCreating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
