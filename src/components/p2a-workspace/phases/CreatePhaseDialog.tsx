import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { P2AMilestone } from '../hooks/useP2APhases';

interface CreatePhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: P2AMilestone[];
  onCreatePhase: (data: {
    name: string;
    description?: string;
    start_milestone_id?: string;
    end_milestone_id?: string;
    color: string;
    display_order: number;
  }) => void;
  onCreateMilestone: (data: {
    name: string;
    code?: string;
    target_date?: string;
    display_order: number;
  }) => void;
  handoverPlanId: string;
  existingPhasesCount: number;
  isCreating?: boolean;
}

const PHASE_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
];

export const CreatePhaseDialog: React.FC<CreatePhaseDialogProps> = ({
  open,
  onOpenChange,
  milestones,
  onCreatePhase,
  onCreateMilestone,
  handoverPlanId,
  existingPhasesCount,
  isCreating,
}) => {
  const [step, setStep] = useState<'milestone' | 'phase'>('phase');
  const [phaseData, setPhaseData] = useState({
    name: '',
    description: '',
    start_milestone_id: '',
    end_milestone_id: '',
    color: PHASE_COLORS[existingPhasesCount % PHASE_COLORS.length].value,
  });

  const [milestoneData, setMilestoneData] = useState({
    name: '',
    code: '',
    target_date: undefined as Date | undefined,
  });

  const resetForm = () => {
    setPhaseData({
      name: '',
      description: '',
      start_milestone_id: '',
      end_milestone_id: '',
      color: PHASE_COLORS[existingPhasesCount % PHASE_COLORS.length].value,
    });
    setMilestoneData({ name: '', code: '', target_date: undefined });
    setStep('phase');
  };

  const handleCreatePhase = () => {
    onCreatePhase({
      ...phaseData,
      start_milestone_id: phaseData.start_milestone_id || undefined,
      end_milestone_id: phaseData.end_milestone_id || undefined,
      display_order: existingPhasesCount,
    });
    resetForm();
    onOpenChange(false);
  };

  const handleCreateMilestone = () => {
    onCreateMilestone({
      name: milestoneData.name,
      code: milestoneData.code || undefined,
      target_date: milestoneData.target_date ? format(milestoneData.target_date, 'yyyy-MM-dd') : undefined,
      display_order: milestones.length,
    });
    setMilestoneData({ name: '', code: '', target_date: undefined });
    setStep('phase');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        {step === 'phase' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Project Phase</DialogTitle>
              <DialogDescription>
                Define a phase in your project timeline between key milestones
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Phase Name *</Label>
                <Input
                  value={phaseData.name}
                  onChange={(e) => setPhaseData({ ...phaseData, name: e.target.value })}
                  placeholder="e.g., MC to RFSU"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={phaseData.description}
                  onChange={(e) => setPhaseData({ ...phaseData, description: e.target.value })}
                  placeholder="Why is this phase important for P2A handover?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Start Milestone</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => setStep('milestone')}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      New
                    </Button>
                  </div>
                  <Select 
                    value={phaseData.start_milestone_id} 
                    onValueChange={(v) => setPhaseData({ ...phaseData, start_milestone_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (Project Start)</SelectItem>
                      {milestones.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.target_date && `(${format(new Date(m.target_date), 'MMM yyyy')})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>End Milestone</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => setStep('milestone')}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      New
                    </Button>
                  </div>
                  <Select 
                    value={phaseData.end_milestone_id} 
                    onValueChange={(v) => setPhaseData({ ...phaseData, end_milestone_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (Ongoing)</SelectItem>
                      {milestones.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {m.target_date && `(${format(new Date(m.target_date), 'MMM yyyy')})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phase Color</Label>
                <div className="flex gap-2">
                  {PHASE_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setPhaseData({ ...phaseData, color: color.value })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        phaseData.color === color.value && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePhase}
                disabled={!phaseData.name.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Phase'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Create a new project milestone to use as phase boundary
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Milestone Name *</Label>
                <Input
                  value={milestoneData.name}
                  onChange={(e) => setMilestoneData({ ...milestoneData, name: e.target.value })}
                  placeholder="e.g., Mechanical Completion, RFSU, 1st Gas"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code (optional)</Label>
                  <Input
                    value={milestoneData.code}
                    onChange={(e) => setMilestoneData({ ...milestoneData, code: e.target.value })}
                    placeholder="e.g., MC, RFSU"
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
                          !milestoneData.target_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {milestoneData.target_date ? format(milestoneData.target_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={milestoneData.target_date}
                        onSelect={(date) => setMilestoneData({ ...milestoneData, target_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('phase')}>
                Back
              </Button>
              <Button 
                onClick={handleCreateMilestone}
                disabled={!milestoneData.name.trim()}
              >
                Add Milestone
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
