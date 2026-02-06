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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Box } from 'lucide-react';
import { WizardSystem } from './SystemsImportStep';

interface AddSystemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (system: WizardSystem) => void;
}

export const AddSystemModal: React.FC<AddSystemModalProps> = ({
  open,
  onOpenChange,
  onAdd,
}) => {
  const [systemId, setSystemId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isHydrocarbon, setIsHydrocarbon] = useState(false);

  const canSubmit = systemId.trim() && name.trim();

  const handleAdd = () => {
    if (!canSubmit) return;

    onAdd({
      id: `manual-${Date.now()}`,
      system_id: systemId.trim(),
      name: name.trim(),
      description: description.trim(),
      is_hydrocarbon: isHydrocarbon,
    });

    // Reset and close
    setSystemId('');
    setName('');
    setDescription('');
    setIsHydrocarbon(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSystemId('');
    setName('');
    setDescription('');
    setIsHydrocarbon(false);
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
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Box className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Add System</DialogTitle>
              <DialogDescription>
                Manually add a system to the handover plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm">
              System Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Power Generation System"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              System ID <span className="text-destructive">*</span>
            </Label>
            <Input
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              placeholder="e.g., C017-DP300-100"
              className="font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Format: LOCATION-PROJECT-NUMBER (e.g., C017-DP300-100)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the system..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="add-hc"
              checked={isHydrocarbon}
              onCheckedChange={(checked) => setIsHydrocarbon(checked as boolean)}
            />
            <Label htmlFor="add-hc" className="text-sm cursor-pointer">
              Hydrocarbon System
            </Label>
            <span className="text-[10px] text-muted-foreground ml-1">(targets RFSU)</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-1" />
            Add System
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
