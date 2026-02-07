import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Milestone,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Key,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from './VCRCreationStep';

export interface WizardPhase {
  id: string;
  name: string;
  description: string;
  display_order: number;
  milestoneIds: string[];
}

interface PhasesStepProps {
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  vcrPhaseAssignments: Record<string, string>;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  onPhasesChange: (phases: WizardPhase[]) => void;
  onVCRPhaseAssignmentsChange: (assignments: Record<string, string>) => void;
}

type SubStage = 'define' | 'assign';

export const PhasesStep: React.FC<PhasesStepProps> = ({
  vcrs,
  phases,
  vcrPhaseAssignments,
  milestones = [],
  onPhasesChange,
  onVCRPhaseAssignmentsChange,
}) => {
  const [subStage, setSubStage] = useState<SubStage>('define');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPhase, setNewPhase] = useState({ name: '', description: '' });
  const [editDraft, setEditDraft] = useState<{ name: string; description: string }>({ name: '', description: '' });

  // ── Phase CRUD ───────────────────────────────────────────
  const handleAddPhase = () => {
    if (!newPhase.name.trim()) return;
    const phase: WizardPhase = {
      id: `phase-${Date.now()}`,
      name: newPhase.name.trim(),
      description: newPhase.description.trim(),
      display_order: phases.length + 1,
      milestoneIds: [],
    };
    onPhasesChange([...phases, phase]);
    setNewPhase({ name: '', description: '' });
  };

  const handleDeletePhase = (id: string) => {
    onPhasesChange(phases.filter(p => p.id !== id).map((p, i) => ({ ...p, display_order: i + 1 })));
    // Remove VCR assignments for deleted phase
    const updated = { ...vcrPhaseAssignments };
    for (const [vcrId, phaseId] of Object.entries(updated)) {
      if (phaseId === id) delete updated[vcrId];
    }
    onVCRPhaseAssignmentsChange(updated);
  };

  const handleStartEdit = (phase: WizardPhase) => {
    setEditingId(phase.id);
    setEditDraft({ name: phase.name, description: phase.description });
  };

  const handleSaveEdit = (id: string) => {
    if (!editDraft.name.trim()) return;
    onPhasesChange(
      phases.map(p =>
        p.id === id ? { ...p, name: editDraft.name.trim(), description: editDraft.description.trim() } : p
      )
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => setEditingId(null);

  // ── Reorder ──────────────────────────────────────────────
  const movePhase = (index: number, direction: 'up' | 'down') => {
    const newPhases = [...phases];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPhases.length) return;
    [newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]];
    onPhasesChange(newPhases.map((p, i) => ({ ...p, display_order: i + 1 })));
  };

  // ── Milestone toggle ─────────────────────────────────────
  const toggleMilestone = (phaseId: string, milestoneId: string) => {
    onPhasesChange(
      phases.map(p => {
        if (p.id !== phaseId) return p;
        const has = p.milestoneIds.includes(milestoneId);
        return {
          ...p,
          milestoneIds: has
            ? p.milestoneIds.filter(m => m !== milestoneId)
            : [...p.milestoneIds, milestoneId],
        };
      })
    );
  };

  // ── VCR assignment ───────────────────────────────────────
  const handlePhaseAssign = (vcrId: string, phaseId: string) => {
    onVCRPhaseAssignmentsChange({ ...vcrPhaseAssignments, [vcrId]: phaseId });
  };

  const unassignedVCRs = vcrs.filter(v => !vcrPhaseAssignments[v.id]);

  // ════════════════════════════════════════════════════════
  // SUB-STAGE: DEFINE PHASES
  // ════════════════════════════════════════════════════════
  const renderDefineStage = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Define Handover Phases</h3>
          <p className="text-xs text-muted-foreground">
            Create phases when handovers are planned (e.g. Pre-TAR, TAR, Post-TAR)
          </p>
        </div>
        <Badge variant="outline">{phases.length} phase{phases.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Phase list */}
      <ScrollArea className="h-[230px]">
        <div className="space-y-2 pr-2">
          {phases.map((phase, index) => {
            const isEditing = editingId === phase.id;

            if (isEditing) {
              return (
                <div key={phase.id} className="p-3 rounded-lg border-2 border-primary/40 bg-primary/5 space-y-2">
                  <Input
                    value={editDraft.name}
                    onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                    placeholder="Phase name"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Textarea
                    value={editDraft.description}
                    onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="text-xs min-h-[48px] resize-none"
                    rows={2}
                  />
                  {/* Milestone selector */}
                  {milestones.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        Applicable Milestones
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {milestones.map(m => {
                          const selected = phases.find(p => p.id === phase.id)?.milestoneIds.includes(m.id);
                          return (
                            <Badge
                              key={m.id}
                              variant={selected ? 'default' : 'outline'}
                              className={cn(
                                'text-[10px] cursor-pointer transition-colors',
                                selected && 'bg-primary'
                              )}
                              onClick={() => toggleMilestone(phase.id, m.id)}
                            >
                              {m.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelEdit}>
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveEdit(phase.id)}>
                      <Check className="h-3 w-3 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={phase.id}
                className="group flex items-start gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                {/* Order controls */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => movePhase(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => movePhase(index, 'down')}
                    disabled={index === phases.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{phase.name}</span>
                    {phase.milestoneIds.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] shrink-0">
                        {phase.milestoneIds.length} milestone{phase.milestoneIds.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {phase.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{phase.description}</p>
                  )}
                  {phase.milestoneIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {phase.milestoneIds.map(mId => {
                        const m = milestones.find(ms => ms.id === mId);
                        return m ? (
                          <span key={mId} className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {m.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(phase)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeletePhase(phase.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {phases.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              <Milestone className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No phases created yet</p>
              <p className="text-[10px] mt-0.5">Add your first phase below</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add new phase */}
      <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Add Phase
        </div>
        <Input
          value={newPhase.name}
          onChange={e => setNewPhase(d => ({ ...d, name: e.target.value }))}
          placeholder="Phase name (e.g. Pre-TAR, TAR, Post-TAR)"
          className="h-8 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleAddPhase()}
        />
        <Textarea
          value={newPhase.description}
          onChange={e => setNewPhase(d => ({ ...d, description: e.target.value }))}
          placeholder="Description (optional)"
          className="text-xs min-h-[40px] resize-none"
          rows={2}
        />
        <Button size="sm" className="h-7 text-xs w-full" onClick={handleAddPhase} disabled={!newPhase.name.trim()}>
          <Plus className="h-3 w-3 mr-1" /> Add Phase
        </Button>
      </div>

      {/* Continue to assign */}
      {phases.length > 0 && vcrs.length > 0 && (
        <Button variant="outline" className="w-full text-xs gap-2" onClick={() => setSubStage('assign')}>
          Continue to VCR Assignment <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════
  // SUB-STAGE: ASSIGN VCRs TO PHASES
  // ════════════════════════════════════════════════════════
  const renderAssignStage = () => (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Assign VCRs to Phases</h3>
          <p className="text-xs text-muted-foreground">
            Map each VCR to the phase when its handover is planned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSubStage('define')}>
            Edit Phases
          </Button>
          <Badge
            variant="outline"
            className={cn(unassignedVCRs.length > 0 && 'bg-amber-50 text-amber-700 border-amber-200')}
          >
            {vcrs.length - unassignedVCRs.length}/{vcrs.length} assigned
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[280px]">
        <div className="space-y-3">
          {/* Phase Timeline with VCRs */}
          {phases.map((phase, index) => {
            const phaseVCRs = vcrs.filter(v => vcrPhaseAssignments[v.id] === phase.id);
            return (
              <div key={phase.id} className="relative">
                {/* Phase Header */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <Milestone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{phase.name}</span>
                    {phase.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{phase.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {phaseVCRs.length} VCR{phaseVCRs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* VCRs in this phase */}
                {phaseVCRs.length > 0 && (
                  <div className="ml-8 mt-2 space-y-1">
                    {phaseVCRs.map(vcr => (
                      <div key={vcr.id} className="flex items-center gap-2 p-2 rounded border bg-card">
                        <Key className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm flex-1">{vcr.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{vcr.code}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connector */}
                {index < phases.length - 1 && (
                  <div className="absolute left-[23px] top-12 h-4 w-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* VCR Assignment selectors */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Assign VCRs to Phases
        </div>
        <div className="space-y-2">
          {vcrs.map(vcr => (
            <div key={vcr.id} className="flex items-center gap-3">
              <Key className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">{vcr.name}</span>
              <Select
                value={vcrPhaseAssignments[vcr.id] || ''}
                onValueChange={value => handlePhaseAssign(vcr.id, value)}
              >
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Select phase..." />
                </SelectTrigger>
                <SelectContent>
                  {phases.map(phase => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── No VCRs fallback ─────────────────────────────────────
  if (vcrs.length === 0 && phases.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="py-8 text-muted-foreground">
          <Milestone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Create VCRs first, then define phases</p>
        </div>
      </div>
    );
  }

  return subStage === 'define' ? renderDefineStage() : renderAssignStage();
};
