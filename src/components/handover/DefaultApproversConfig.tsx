import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, GripVertical, Trash2, Edit2, Check, X, Users } from 'lucide-react';
import { useDefaultHandoverApprovers, DefaultApprover } from '@/hooks/useDefaultHandoverApprovers';
import { toast } from 'sonner';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface SortableApproverItemProps {
  approver: DefaultApprover & { id: string };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableApproverItem({ approver, onEdit, onDelete }: SortableApproverItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
            #{approver.display_order}
          </span>
          <span className="font-medium">{approver.role_name}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}

interface DefaultApproversConfigProps {
  certificateType: 'PAC' | 'FAC' | 'VCR';
}

export default function DefaultApproversConfig({ certificateType }: DefaultApproversConfigProps) {
  const { templateId, approvers, isLoading, updateApprovers, isUpdating } = useDefaultHandoverApprovers(certificateType);
  
  const [localApprovers, setLocalApprovers] = useState<(DefaultApprover & { id: string })[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from fetched data
  if (!isInitialized && approvers.length > 0) {
    setLocalApprovers(approvers.map((a, i) => ({ ...a, id: `approver-${i}` })));
    setIsInitialized(true);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLocalApprovers((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          display_order: index + 1,
        }));
        
        return newItems;
      });
      setHasChanges(true);
    }
  };

  const handleAddApprover = () => {
    if (!roleName.trim()) return;
    
    const newApprover: DefaultApprover & { id: string } = {
      id: `approver-${Date.now()}`,
      role_name: roleName.trim(),
      display_order: localApprovers.length + 1,
    };
    
    setLocalApprovers([...localApprovers, newApprover]);
    setRoleName('');
    setAddDialogOpen(false);
    setHasChanges(true);
  };

  const handleEditApprover = () => {
    if (!roleName.trim() || !editingId) return;
    
    setLocalApprovers(localApprovers.map(a => 
      a.id === editingId ? { ...a, role_name: roleName.trim() } : a
    ));
    setRoleName('');
    setEditingId(null);
    setEditDialogOpen(false);
    setHasChanges(true);
  };

  const handleDeleteApprover = (id: string) => {
    setLocalApprovers(localApprovers
      .filter(a => a.id !== id)
      .map((a, index) => ({ ...a, display_order: index + 1 }))
    );
    setHasChanges(true);
  };

  const openEditDialog = (id: string) => {
    const approver = localApprovers.find(a => a.id === id);
    if (approver) {
      setRoleName(approver.role_name);
      setEditingId(id);
      setEditDialogOpen(true);
    }
  };

  const handleSave = () => {
    if (!templateId) {
      toast.error('No template found');
      return;
    }
    
    const approversToSave: DefaultApprover[] = localApprovers.map(({ role_name, display_order }) => ({
      role_name,
      display_order,
    }));
    
    updateApprovers(
      { templateId, approvers: approversToSave },
      {
        onSuccess: () => {
          toast.success('Default approvers saved successfully');
          setHasChanges(false);
        },
        onError: (error) => {
          toast.error('Failed to save approvers');
          console.error(error);
        },
      }
    );
  };

  const handleReset = () => {
    setLocalApprovers(approvers.map((a, i) => ({ ...a, id: `approver-${i}` })));
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Default {certificateType} Approvers
            </CardTitle>
            <CardDescription>
              Configure the default approval chain for {certificateType} handovers. These approvers will be pre-populated when creating new handovers.
            </CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Approver
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {localApprovers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No default approvers configured</p>
            <p className="text-sm">Add approvers to define the default approval chain</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localApprovers.map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localApprovers.map((approver) => (
                  <SortableApproverItem
                    key={approver.id}
                    approver={approver}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteApprover}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {hasChanges && (
          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={handleReset} disabled={isUpdating}>
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Approver Role</DialogTitle>
            <DialogDescription>
              Add a new approver role to the default approval chain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., Project Manager, Operations Lead"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddApprover()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddApprover} disabled={!roleName.trim()}>
              Add Approver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Approver Role</DialogTitle>
            <DialogDescription>
              Update the approver role name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEditApprover()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditApprover} disabled={!roleName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
