import React, { useState } from 'react';
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

interface EditChecklistItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemDescription: string;
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
  onSave,
}) => {
  const [customDescription, setCustomDescription] = useState('');
  const [customResponsible, setCustomResponsible] = useState('');
  const [customApprover, setCustomApprover] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    onSave({
      custom_description: customDescription || undefined,
      custom_responsible: customResponsible || undefined,
      custom_approver: customApprover || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Checklist Item</DialogTitle>
          <DialogDescription>
            Customize this item for this specific checklist. Changes won't affect the original library item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Original Description</Label>
            <p className="text-sm">{itemDescription}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customDescription">Custom Description (Optional)</Label>
            <Textarea
              id="customDescription"
              placeholder="Enter custom description for this checklist..."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customResponsible">Custom Responsible Party</Label>
              <Input
                id="customResponsible"
                placeholder="e.g., Operations Lead"
                value={customResponsible}
                onChange={(e) => setCustomResponsible(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customApprover">Custom Approver</Label>
              <Input
                id="customApprover"
                placeholder="e.g., Safety Manager"
                value={customApprover}
                onChange={(e) => setCustomApprover(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes specific to this item..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
