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
import { GitMerge, ArrowRight } from 'lucide-react';
import { WizardVCR } from '../VCRCreationStep';

interface CombineVCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceVCR: WizardVCR;
  targetVCR: WizardVCR;
  onCombine: (sourceId: string, targetId: string, newName: string) => void;
}

export const CombineVCRDialog: React.FC<CombineVCRDialogProps> = ({
  open,
  onOpenChange,
  sourceVCR,
  targetVCR,
  onCombine,
}) => {
  const [name, setName] = useState(`${sourceVCR.name} + ${targetVCR.name}`);

  const handleCombine = () => {
    if (!name.trim()) return;
    onCombine(sourceVCR.id, targetVCR.id, name.trim());
    onOpenChange(false);
  };

  // Reset name when dialog opens with new VCRs
  React.useEffect(() => {
    if (open) {
      setName(`${sourceVCR.name} + ${targetVCR.name}`);
    }
  }, [open, sourceVCR.name, targetVCR.name]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            Combine VCRs
          </DialogTitle>
          <DialogDescription>
            Merge two VCRs into a single new VCR
          </DialogDescription>
        </DialogHeader>

        {/* VCR preview */}
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex-1 rounded-lg bg-muted p-3 text-center">
            <code className="text-[10px] font-mono text-muted-foreground">{sourceVCR.code}</code>
            <p className="mt-1 text-sm font-medium truncate">{sourceVCR.name}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 rounded-lg bg-muted p-3 text-center">
            <code className="text-[10px] font-mono text-muted-foreground">{targetVCR.code}</code>
            <p className="mt-1 text-sm font-medium truncate">{targetVCR.name}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="combine-name">New VCR Name</Label>
          <Input
            id="combine-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter combined VCR name"
            autoFocus
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          All system mappings from both VCRs will be merged into the new VCR.
          The original VCRs will be removed.
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCombine} disabled={!name.trim()}>
            Combine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
