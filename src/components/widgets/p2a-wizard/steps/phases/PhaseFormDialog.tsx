import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Milestone, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardPhase } from '../PhasesStep';

interface PhaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Array<{ id: string; name: string; target_date?: string }>;
  /** Pass an existing phase to edit, or null to create */
  editingPhase: WizardPhase | null;
  onSave: (data: { name: string; description: string; milestoneIds: string[] }) => void;
}

export const PhaseFormDialog: React.FC<PhaseFormDialogProps> = ({
  open,
  onOpenChange,
  milestones,
  editingPhase,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (editingPhase) {
        setName(editingPhase.name);
        setDescription(editingPhase.description);
        setSelectedMilestones([...editingPhase.milestoneIds]);
      } else {
        setName('');
        setDescription('');
        setSelectedMilestones([]);
      }
    }
  }, [open, editingPhase]);

  const toggleMilestone = (id: string) => {
    setSelectedMilestones(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      milestoneIds: selectedMilestones,
    });
    onOpenChange(false);
  };

  const isEditing = !!editingPhase;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditing ? 'Edit Phase' : 'Create Phase'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? 'Update the phase details and milestone associations.'
              : 'Define a handover phase and optionally link project milestones.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phase Name
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pre-TAR, TAR, Post-TAR"
              className="h-9 text-sm bg-background"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Description */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this handover phase..."
              className="text-sm min-h-[72px] resize-none bg-background"
              rows={3}
            />
          </div>

          {/* Milestone selector */}
          {milestones.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Applicable Milestones
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select milestones that fall within this phase
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {milestones.map(m => {
                  const selected = selectedMilestones.includes(m.id);
                  return (
                    <Badge
                      key={m.id}
                      variant={selected ? 'default' : 'outline'}
                      className={cn(
                        'text-xs cursor-pointer transition-all gap-1',
                        selected
                          ? 'bg-primary hover:bg-primary/90'
                          : 'hover:bg-accent bg-background'
                      )}
                      onClick={() => toggleMilestone(m.id)}
                    >
                      <Milestone className="h-3 w-3" />
                      {m.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()} className="gap-1.5">
            {isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {isEditing ? 'Save Changes' : 'Create Phase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
