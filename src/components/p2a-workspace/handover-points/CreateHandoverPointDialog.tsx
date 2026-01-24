import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateHandoverPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHandoverPoint: (data: {
    phase_id: string;
    name: string;
    description?: string;
    project_code: string;
    target_date?: string;
  }) => void;
  phaseId: string;
  phaseName: string;
  projectCode: string;
  isCreating?: boolean;
}

export const CreateHandoverPointDialog: React.FC<CreateHandoverPointDialogProps> = ({
  open,
  onOpenChange,
  onCreateHandoverPoint,
  phaseId,
  phaseName,
  projectCode,
  isCreating,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_date: undefined as Date | undefined,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      target_date: undefined,
    });
  };

  const handleCreate = () => {
    onCreateHandoverPoint({
      phase_id: phaseId,
      name: formData.name,
      description: formData.description || undefined,
      project_code: projectCode,
      target_date: formData.target_date ? format(formData.target_date, 'yyyy-MM-dd') : undefined,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Handover Point (VCR)</DialogTitle>
          <DialogDescription>
            Add a Verification of Readiness checkpoint in the "{phaseName}" phase
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
