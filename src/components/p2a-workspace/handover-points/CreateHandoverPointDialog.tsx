import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
  selectedPhaseId?: string | null; // Optional - if provided, pre-selects the phase
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phase_id: selectedPhaseId || (phases.length > 0 ? phases[0].id : ''),
    target_date: undefined as Date | undefined,
  });

  // Update phase_id when selectedPhaseId or phases change
  React.useEffect(() => {
    if (open) {
      // Default to selected phase, or first phase if none selected
      const defaultPhaseId = selectedPhaseId || (phases.length > 0 ? phases[0].id : '');
      setFormData(prev => ({ ...prev, phase_id: defaultPhaseId }));
    }
  }, [selectedPhaseId, phases, open]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      phase_id: selectedPhaseId || (phases.length > 0 ? phases[0].id : ''),
      target_date: undefined,
    });
  };

  const handleCreate = () => {
    onCreateHandoverPoint({
      phase_id: formData.phase_id || undefined,
      name: formData.name,
      description: formData.description || undefined,
      project_code: projectCode,
      target_date: formData.target_date ? format(formData.target_date, 'yyyy-MM-dd') : undefined,
      handover_plan_id: handoverPlanId,
    });
    resetForm();
    onOpenChange(false);
  };

  const selectedPhase = phases.find(p => p.id === formData.phase_id);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Handover Point (VCR)</DialogTitle>
          <DialogDescription>
            {selectedPhase 
              ? `Add a Verification of Readiness checkpoint in the "${selectedPhase.name}" phase`
              : 'Create a VCR that can be assigned to a phase later'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              VCR Code (Auto-generated)
            </div>
            <div className="font-mono text-sm font-medium">
              VCR-{projectCode || 'XXX'}-###
            </div>
          </div>

          <div className="space-y-2">
            <Label>Handover Point Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Critical Utilities Batch 1"
            />
          </div>

          <div className="space-y-2">
            <Label>Phase {phases.length > 0 && <span className="text-muted-foreground font-normal">(defaults to first phase)</span>}</Label>
            <Select 
              value={formData.phase_id || "unassigned"} 
              onValueChange={(v) => setFormData({ ...formData, phase_id: v === "unassigned" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a phase" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {phases.map((phase, idx) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {phase.name}
                      {idx === 0 && <span className="text-xs text-muted-foreground">(default)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              VCRs are placed in phases to show handover progression
            </p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Why does this handover point exist? What systems will be grouped here?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.target_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.target_date ? format(formData.target_date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.target_date}
                  onSelect={(date) => setFormData({ ...formData, target_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!formData.name.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create VCR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
