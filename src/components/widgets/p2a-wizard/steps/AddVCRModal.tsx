import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Key } from 'lucide-react';
import { WizardVCR } from './VCRCreationStep';

interface AddVCRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (vcr: WizardVCR) => void;
  generatedCode: string;
}

export const AddVCRModal: React.FC<AddVCRModalProps> = ({
  open,
  onOpenChange,
  onAdd,
  generatedCode,
}) => {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');

  const canSubmit = name.trim().length > 0;

  const handleAdd = () => {
    if (!canSubmit) return;

    onAdd({
      id: `temp-${Date.now()}`,
      name: name.trim(),
      reason: reason.trim(),
      targetMilestone: '',
      code: generatedCode,
    });

    setName('');
    setReason('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setName('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md z-[150]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Add VCR</DialogTitle>
              <DialogDescription>
                Create a new verification checkpoint
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">
              VCR Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Power and Utilities Handover"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Description</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this VCR needed? What systems does it cover?"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Auto-assigned VCR ID preview */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
            <span className="text-xs text-muted-foreground">VCR ID:</span>
            <span className="text-xs font-mono font-medium">{generatedCode}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">(auto-assigned)</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-1" />
            Add VCR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
