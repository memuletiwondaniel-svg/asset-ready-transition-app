import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { User, Trash2, UserPlus } from 'lucide-react';
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
  const [customDescription, setCustomDescription] = useState('');
  const [customResponsible, setCustomResponsible] = useState('');
  const [customApprover, setCustomApprover] = useState('');
  const [notes, setNotes] = useState('');

  const activeUsers = users?.filter(u => u.status === 'active') || [];

  useEffect(() => {
    if (open && existingCustomization) {
      setCustomDescription(existingCustomization.custom_description || '');
      setCustomResponsible(existingCustomization.custom_responsible || '');
      setCustomApprover(existingCustomization.custom_approver || '');
      setNotes(existingCustomization.notes || '');
    } else if (open) {
      setCustomDescription('');
      setCustomResponsible(currentResponsible || '');
      setCustomApprover(currentApprover || '');
      setNotes('');
    }
  }, [open, existingCustomization, currentResponsible, currentApprover]);

  const handleSave = () => {
    onSave({
      custom_description: customDescription || undefined,
      custom_responsible: customResponsible || undefined,
      custom_approver: customApprover || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const handleClearResponsible = () => {
    setCustomResponsible('');
  };

  const handleClearApprover = () => {
    setCustomApprover('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {itemId}
            </Badge>
            <DialogTitle className="text-lg">Edit Checklist Item</DialogTitle>
          </div>
          <DialogDescription>
            Customize this item for this specific checklist. Changes won't affect the original library item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 overflow-y-auto flex-1">
          {/* Original Description */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Original Description
              </Label>
            </div>
            <div className="bg-accent/10 p-4 rounded-lg border-l-4 border-muted/50">
              <p className="text-sm leading-relaxed text-muted-foreground">{itemDescription}</p>
            </div>
          </div>

          {/* Custom Description */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label htmlFor="customDescription" className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Custom Description <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
              </Label>
            </div>
            <div className="bg-accent/10 p-4 rounded-lg border-l-4 border-primary/30">
              <Textarea
                id="customDescription"
                placeholder="Override the description for this checklist..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="min-h-[100px] border-0 bg-background/80 focus:bg-background focus-visible:ring-0 resize-none"
              />
            </div>
          </div>

          {/* Responsible Party */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Responsible Party
              </Label>
              {currentResponsible && !customResponsible && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: <span className="font-medium">{currentResponsible}</span>
                </p>
              )}
            </div>
            <div className="bg-blue-500/5 p-4 rounded-lg border-l-4 border-blue-500/30">
              <div className="flex gap-2">
                <Select value={customResponsible} onValueChange={setCustomResponsible}>
                  <SelectTrigger className="flex-1 border-0 bg-background/80 focus:bg-background focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select responsible party..." />
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
                {customResponsible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearResponsible}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Custom Approver */}
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Custom Approver
              </Label>
              {currentApprover && !customApprover && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: <span className="font-medium">{currentApprover}</span>
                </p>
              )}
            </div>
            <div className="bg-green-500/5 p-4 rounded-lg border-l-4 border-green-500/30">
              <div className="flex gap-2">
                <Select value={customApprover} onValueChange={setCustomApprover}>
                  <SelectTrigger className="flex-1 border-0 bg-background/80 focus:bg-background focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select approver..." />
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
                {customApprover && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearApprover}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
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
          <Button onClick={handleSave} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
