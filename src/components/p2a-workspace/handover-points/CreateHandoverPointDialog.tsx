import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Key } from 'lucide-react';
import { P2APhase } from '../hooks/useP2APhases';

interface CreateHandoverPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHandoverPoint: (data: {
    phase_id?: string;
    name: string;
    description?: string;
    project_code: string;
    target_date?: string;
    handover_plan_id: string;
  }) => void;
  phases: P2APhase[];
  selectedPhaseId?: string | null;
  projectCode: string;
  handoverPlanId: string;
  isCreating?: boolean;
}

export const CreateHandoverPointDialog: React.FC<CreateHandoverPointDialogProps> = ({
  open,
  onOpenChange,
  onCreateHandoverPoint,
  phases,
  selectedPhaseId,
  projectCode,
  handoverPlanId,
  isCreating,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Determine the phase ID to use
  const effectivePhaseId = selectedPhaseId || (phases.length > 0 ? phases[0].id : undefined);

  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const canSubmit = name.trim().length > 0;

  const handleCreate = () => {
    if (!canSubmit) return;

    onCreateHandoverPoint({
      phase_id: effectivePhaseId || undefined,
      name: name.trim(),
      description: description.trim() || undefined,
      project_code: projectCode,
      handover_plan_id: handoverPlanId,
    });

    setName('');
    setDescription('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this VCR needed? What systems does it cover?"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Auto-assigned VCR ID preview */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
            <span className="text-xs text-muted-foreground">VCR ID:</span>
            <span className="text-xs font-mono font-medium">VCR-{projectCode || 'XXX'}-###</span>
            <span className="text-[10px] text-muted-foreground ml-auto">(auto-assigned)</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || isCreating}>
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? 'Creating...' : 'Add VCR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
