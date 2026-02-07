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
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2APhase } from '../hooks/useP2APhases';

interface EditPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: P2APhase;
  onUpdatePhase: (data: { id: string; updates: Partial<P2APhase> }) => void;
}

const PHASE_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
];

export const EditPhaseDialog: React.FC<EditPhaseDialogProps> = ({
  open,
  onOpenChange,
  phase,
  onUpdatePhase,
}) => {
  const [name, setName] = useState(phase.name);
  const [description, setDescription] = useState(phase.description || '');
  const [color, setColor] = useState(phase.color || PHASE_COLORS[0].value);

  useEffect(() => {
    if (open) {
      setName(phase.name);
      setDescription(phase.description || '');
      setColor(phase.color || PHASE_COLORS[0].value);
    }
  }, [open, phase]);

  const handleSave = () => {
    if (!name.trim()) return;

    onUpdatePhase({
      id: phase.id,
      updates: {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Phase</DialogTitle>
          <DialogDescription className="text-xs">
            Update the phase name, description, or color.
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
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
