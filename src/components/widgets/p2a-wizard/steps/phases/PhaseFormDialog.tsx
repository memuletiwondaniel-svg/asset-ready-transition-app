import React, { useState, useEffect, useMemo } from 'react';
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
import { Check, Plus, Save, Search } from 'lucide-react';
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

/**
 * Parse a milestone_name string into acronym + full name.
 * Accepts patterns like "RFSU", "RFSU - Ready for Start-up", "PAC · Provisional Acceptance".
 * If no separator, the whole string is treated as the acronym (no secondary label).
 */
function parseMilestoneName(raw: string): { acronym: string; full?: string } {
  const s = (raw || '').trim();
  const m = s.match(/^([^\-–—·:]+?)\s*[-–—·:]\s*(.+)$/);
  if (m) return { acronym: m[1].trim(), full: m[2].trim() };
  return { acronym: s };
}

function formatDate(d?: string): string | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return undefined;
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
  const [query, setQuery] = useState('');

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
      setQuery('');
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

  const filteredMilestones = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return milestones;
    return milestones.filter(m => m.name.toLowerCase().includes(q));
  }, [milestones, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md z-[150]"
        overlayClassName="z-[140] bg-black/70 backdrop-blur-sm"
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEditing ? 'Edit Handover Phase' : 'Create Handover Phase'}
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

          {/* Milestone selector — pulled from project_milestones */}
          {milestones.length > 0 ? (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Applicable Milestones
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select milestones that fall within this phase
                </p>
              </div>

              {/* Search */}
              {milestones.length > 4 && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search milestones..."
                    className="h-8 pl-7 text-xs bg-background"
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-1">
                {filteredMilestones.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground py-3 text-center">
                    No milestones match "{query}"
                  </p>
                ) : (
                  filteredMilestones.map(m => {
                    const selected = selectedMilestones.includes(m.id);
                    const { acronym, full } = parseMilestoneName(m.name);
                    const dateLabel = formatDate(m.target_date);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMilestone(m.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors border',
                          selected
                            ? 'bg-primary/10 border-primary/40 hover:bg-primary/15'
                            : 'bg-background border-transparent hover:bg-accent/60'
                        )}
                      >
                        <div
                          className={cn(
                            'h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors',
                            selected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40'
                          )}
                        >
                          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0 flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {acronym}
                          </span>
                          {full && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              · {full}
                            </span>
                          )}
                        </div>
                        {dateLabel && (
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {dateLabel}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">
                No project milestones defined yet. Add milestones to this project to link them to phases.
              </p>
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
