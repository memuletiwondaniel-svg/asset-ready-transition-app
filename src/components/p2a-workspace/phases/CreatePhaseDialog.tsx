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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
  const [color, setColor] = useState(PHASE_COLORS[existingPhasesCount % PHASE_COLORS.length].value);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedMilestones([]);
      setColor(PHASE_COLORS[existingPhasesCount % PHASE_COLORS.length].value);
    }
  }, [open, existingPhasesCount]);

  const toggleMilestone = (id: string) => {
    setSelectedMilestones(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    // Derive start/end milestones from selection (first = start, last = end)
    const sortedSelected = milestones
      .filter(m => selectedMilestones.includes(m.id))
      .sort((a, b) => a.display_order - b.display_order);

    onCreatePhase({
      name: name.trim(),
      description: description.trim() || undefined,
      start_milestone_id: sortedSelected[0]?.id,
      end_milestone_id: sortedSelected.length > 1 ? sortedSelected[sortedSelected.length - 1]?.id : undefined,
      color,
      display_order: existingPhasesCount,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Create Phase</DialogTitle>
          <DialogDescription className="text-xs">
            Define a handover phase and optionally link project milestones.
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
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
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

          {/* Phase Color */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phase Color
            </label>
            <div className="flex gap-2">
              {PHASE_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c.value && 'ring-2 ring-offset-2 ring-primary'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
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
          <Button size="sm" onClick={handleCreate} disabled={!name.trim() || isCreating} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {isCreating ? 'Creating...' : 'Create Phase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
