import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { User, Trash2, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditChecklistItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemDescription: string;
  currentResponsible?: string;
  currentApprover?: string;
  existingCustomization?: {
    custom_description?: string;
    custom_responsible?: string;
    custom_approver?: string;
    notes?: string;
  };
  onSave: (customization: {
    custom_description?: string;
    custom_responsible?: string;
    custom_approver?: string;
    notes?: string;
  }) => void;
}

export const EditChecklistItemDialog: React.FC<EditChecklistItemDialogProps> = ({
  open,
  onOpenChange,
  itemId,
  itemDescription,
  currentResponsible,
  currentApprover,
  existingCustomization,
  onSave,
}) => {
  const { users } = useUsers();
  const [description, setDescription] = useState('');
  const [responsibleParties, setResponsibleParties] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<string[]>([]);
  const [newResponsible, setNewResponsible] = useState('');
  const [newApprover, setNewApprover] = useState('');
  const [notes, setNotes] = useState('');

  const activeUsers = users?.filter(u => u.status === 'active') || [];

  useEffect(() => {
    if (open) {
      // Set description from customization or original
      setDescription(existingCustomization?.custom_description || itemDescription);
      
      // Initialize responsible parties
      const initialResponsible = existingCustomization?.custom_responsible || currentResponsible || '';
      setResponsibleParties(initialResponsible ? initialResponsible.split(',').map(s => s.trim()).filter(Boolean) : []);
      
      // Initialize approvers
      const initialApprover = existingCustomization?.custom_approver || currentApprover || '';
      setApprovers(initialApprover ? initialApprover.split(',').map(s => s.trim()).filter(Boolean) : []);
      
      setNotes(existingCustomization?.notes || '');
      setNewResponsible('');
      setNewApprover('');
    }
  }, [open, existingCustomization, itemDescription, currentResponsible, currentApprover]);

  const handleAddResponsible = () => {
    if (newResponsible && !responsibleParties.includes(newResponsible)) {
      setResponsibleParties([...responsibleParties, newResponsible]);
      setNewResponsible('');
    }
  };

  const handleRemoveResponsible = (party: string) => {
    setResponsibleParties(responsibleParties.filter(p => p !== party));
  };

  const handleAddApprover = () => {
    if (newApprover && !approvers.includes(newApprover)) {
      setApprovers([...approvers, newApprover]);
      setNewApprover('');
    }
  };

  const handleRemoveApprover = (approver: string) => {
    setApprovers(approvers.filter(a => a !== approver));
  };

  const handleSave = () => {
    onSave({
      custom_description: description !== itemDescription ? description : undefined,
      custom_responsible: responsibleParties.length > 0 ? responsibleParties.join(', ') : undefined,
      custom_approver: approvers.length > 0 ? approvers.join(', ') : undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs font-semibold">
              {itemId}
            </Badge>
            <DialogTitle className="text-lg">Edit Checklist Item</DialogTitle>
          </div>
          <DialogDescription>
            Customize this item for this specific checklist. Changes won't affect the original library item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 overflow-y-auto flex-1">
          {/* Description */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Description <span className="text-destructive">*</span>
              </Label>
            </div>
            <div className="bg-accent/10 p-4 rounded-lg border-l-4 border-primary/30">
              <Textarea
                id="description"
                placeholder="Enter item description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] border-0 bg-background/80 focus:bg-background focus-visible:ring-0 resize-none"
              />
            </div>
          </div>

          {/* Responsible Parties */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Responsible Parties
              </Label>
            </div>
            <div className="bg-blue-500/5 p-4 rounded-lg border-l-4 border-blue-500/30 space-y-3">
              {/* Current Parties */}
              {responsibleParties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {responsibleParties.map((party) => (
                    <Badge key={party} variant="secondary" className="gap-2 pr-1">
                      <User className="w-3 h-3" />
                      {party}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => handleRemoveResponsible(party)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              {/* Add New */}
              <div className="flex gap-2">
                <Select value={newResponsible} onValueChange={setNewResponsible}>
                  <SelectTrigger className="flex-1 border-0 bg-background/80 focus:bg-background focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select user to add..." />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover max-h-[300px]">
                    {activeUsers.map((user) => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName}`}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddResponsible}
                  disabled={!newResponsible}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Approvers */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Approvers
              </Label>
            </div>
            <div className="bg-green-500/5 p-4 rounded-lg border-l-4 border-green-500/30 space-y-3">
              {/* Current Approvers */}
              {approvers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {approvers.map((approver) => (
                    <Badge key={approver} variant="secondary" className="gap-2 pr-1">
                      <User className="w-3 h-3" />
                      {approver}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => handleRemoveApprover(approver)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              {/* Add New */}
              <div className="flex gap-2">
                <Select value={newApprover} onValueChange={setNewApprover}>
                  <SelectTrigger className="flex-1 border-0 bg-background/80 focus:bg-background focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select user to add..." />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover max-h-[300px]">
                    {activeUsers.map((user) => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName}`}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddApprover}
                  disabled={!newApprover}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Additional Notes <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
              </Label>
            </div>
            <div className="bg-amber-500/5 p-4 rounded-lg border-l-4 border-amber-500/30">
              <Textarea
                id="notes"
                placeholder="Add any notes specific to this item..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] border-0 bg-background/80 focus:bg-background focus-visible:ring-0 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={!description.trim()}>
            <UserPlus className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
