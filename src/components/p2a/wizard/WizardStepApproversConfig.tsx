import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Trash2, 
  GripVertical, 
  Edit2, 
  Check,
  X,
  UserCheck
} from 'lucide-react';
import { useProfileUsers } from '@/hooks/useProfileUsers';
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

export interface ApproverConfig {
  id: string;
  roleName: string;
  userId: string | null;
  displayOrder: number;
}

interface WizardStepApproversConfigProps {
  approvers: ApproverConfig[];
  onApproversChange: (approvers: ApproverConfig[]) => void;
}

// Sortable Approver Row Component
const SortableApproverRow: React.FC<{
  approver: ApproverConfig;
  users: { user_id: string; full_name: string; position?: string | null }[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onUserChange: (id: string, userId: string | null) => void;
}> = ({ approver, users, onEdit, onDelete, onUserChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: approver.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const selectedUser = users.find(u => u.user_id === approver.userId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <Badge variant="outline" className="font-medium min-w-[32px] justify-center">
        {approver.displayOrder}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{approver.roleName}</p>
        {selectedUser ? (
          <p className="text-xs text-muted-foreground truncate">
            {selectedUser.full_name}
            {selectedUser.position && ` - ${selectedUser.position}`}
          </p>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No user assigned
          </p>
        )}
      </div>

      <Select
        value={approver.userId || ''}
        onValueChange={(value) => onUserChange(approver.id, value || null)}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Assign user..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Unassigned</SelectItem>
          {users.map(user => (
            <SelectItem key={user.user_id} value={user.user_id}>
              <span>{user.full_name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onEdit(approver.id)}
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onDelete(approver.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const WizardStepApproversConfig: React.FC<WizardStepApproversConfigProps> = ({
  approvers,
  onApproversChange,
}) => {
  const { data: users } = useProfileUsers();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingApprover, setEditingApprover] = useState<ApproverConfig | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = approvers.findIndex((a) => a.id === active.id);
      const newIndex = approvers.findIndex((a) => a.id === over.id);

      const reordered = arrayMove(approvers, oldIndex, newIndex).map((a, index) => ({
        ...a,
        displayOrder: index + 1,
      }));

      onApproversChange(reordered);
    }
  };

  const handleAddApprover = () => {
    if (!newRoleName.trim()) return;

    const newApprover: ApproverConfig = {
      id: `temp-${Date.now()}`,
      roleName: newRoleName.trim(),
      userId: null,
      displayOrder: approvers.length + 1,
    };

    onApproversChange([...approvers, newApprover]);
    setNewRoleName('');
    setShowAddDialog(false);
  };

  const handleEditApprover = () => {
    if (!editingApprover || !editingApprover.roleName.trim()) return;

    const updated = approvers.map(a =>
      a.id === editingApprover.id
        ? { ...a, roleName: editingApprover.roleName }
        : a
    );

    onApproversChange(updated);
    setEditingApprover(null);
    setShowEditDialog(false);
  };

  const handleDeleteApprover = (id: string) => {
    const filtered = approvers
      .filter(a => a.id !== id)
      .map((a, index) => ({ ...a, displayOrder: index + 1 }));
    onApproversChange(filtered);
  };

  const handleUserChange = (approverId: string, userId: string | null) => {
    const updated = approvers.map(a =>
      a.id === approverId ? { ...a, userId } : a
    );
    onApproversChange(updated);
  };

  const openEditDialog = (id: string) => {
    const approver = approvers.find(a => a.id === id);
    if (approver) {
      setEditingApprover({ ...approver });
      setShowEditDialog(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <UserCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Configure Approvers</h3>
            <p className="text-sm text-muted-foreground">
              Set up the approval chain for this handover
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm">
            Approvers will be notified in order. Drag to reorder, click to edit roles, or assign specific users.
          </p>
        </CardContent>
      </Card>

      {/* Approvers List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Approval Chain ({approvers.length})
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Approver
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {approvers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No approvers configured. Click "Add Approver" to start.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={approvers.map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {approvers.map((approver) => (
                    <SortableApproverRow
                      key={approver.id}
                      approver={approver}
                      users={users || []}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteApprover}
                      onUserChange={handleUserChange}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add Approver Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Approver</DialogTitle>
            <DialogDescription>
              Enter the role name for this approver position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                placeholder="e.g., Operations Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddApprover} disabled={!newRoleName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Approver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Approver</DialogTitle>
            <DialogDescription>
              Update the role name for this approver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={editingApprover?.roleName || ''}
                onChange={(e) => setEditingApprover(prev => 
                  prev ? { ...prev, roleName: e.target.value } : null
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditApprover} disabled={!editingApprover?.roleName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
