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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Box } from 'lucide-react';
import { P2ASystem } from '../hooks/useP2ASystems';

interface WorkspaceAddSystemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSystem: (system: Omit<P2ASystem, 'id' | 'created_at' | 'updated_at' | 'assigned_handover_point_id' | 'assigned_vcr_code'>) => void;
  handoverPlanId: string;
  plantCode?: string;
  projectCode?: string;
  isAdding?: boolean;
}

export const WorkspaceAddSystemModal: React.FC<WorkspaceAddSystemModalProps> = ({
  open,
  onOpenChange,
  onAddSystem,
  handoverPlanId,
  plantCode = '',
  projectCode = '',
  isAdding,
}) => {
  const [systemId, setSystemId] = useState(
    plantCode && projectCode ? `${plantCode}-${projectCode}-` : ''
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isHydrocarbon, setIsHydrocarbon] = useState(false);

  const canSubmit = systemId.trim() && name.trim();

  const handleAdd = () => {
    if (!canSubmit) return;

    onAddSystem({
      handover_plan_id: handoverPlanId,
      system_id: systemId.trim(),
      name: name.trim(),
      is_hydrocarbon: isHydrocarbon,
      completion_status: 'NOT_STARTED',
      completion_percentage: 0,
      source_type: 'MANUAL',
      punchlist_a_count: 0,
      punchlist_b_count: 0,
      itr_a_count: 0,
      itr_b_count: 0,
      itr_total_count: 0,
    });

    handleClose();
  };

  const handleClose = () => {
    setSystemId(plantCode && projectCode ? `${plantCode}-${projectCode}-` : '');
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
              id="ws-add-hc"
              checked={isHydrocarbon}
              onCheckedChange={(checked) => setIsHydrocarbon(checked as boolean)}
            />
            <Label htmlFor="ws-add-hc" className="text-sm cursor-pointer">
              Hydrocarbon System
            </Label>
            <span className="text-[10px] text-muted-foreground ml-1">(targets RFSU)</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canSubmit || isAdding}>
            <Plus className="h-4 w-4 mr-1" />
            {isAdding ? 'Adding...' : 'Add System'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
