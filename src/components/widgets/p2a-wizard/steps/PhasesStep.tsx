import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Milestone,
  Plus,
  Key,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from './VCRCreationStep';
import { PhaseCard } from './phases/PhaseCard';
import { PhaseFormDialog } from './phases/PhaseFormDialog';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<WizardPhase | null>(null);

  // ── Phase CRUD ───────────────────────────────────────────
  const handleCreatePhase = (data: { name: string; description: string; milestoneIds: string[] }) => {
    const phase: WizardPhase = {
      id: `phase-${Date.now()}`,
      name: data.name,
      description: data.description,
      display_order: phases.length + 1,
      milestoneIds: data.milestoneIds,
    };
    onPhasesChange([...phases, phase]);
  };

  const handleEditPhase = (data: { name: string; description: string; milestoneIds: string[] }) => {
    if (!editingPhase) return;
    onPhasesChange(
      phases.map(p =>
        p.id === editingPhase.id
          ? { ...p, name: data.name, description: data.description, milestoneIds: data.milestoneIds }
          : p
      )
    );
  };

  const handleDeletePhase = (id: string) => {
    onPhasesChange(phases.filter(p => p.id !== id).map((p, i) => ({ ...p, display_order: i + 1 })));
    const updated = { ...vcrPhaseAssignments };
    for (const [vcrId, phaseId] of Object.entries(updated)) {
      if (phaseId === id) delete updated[vcrId];
    }
    onVCRPhaseAssignmentsChange(updated);
  };

  const handleStartEdit = (phase: WizardPhase) => {
    setEditingPhase(phase);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPhase(null);
    setDialogOpen(true);
  };

  // ── Reorder ──────────────────────────────────────────────
  const movePhase = (index: number, direction: 'left' | 'right') => {
    const newPhases = [...phases];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPhases.length) return;
    [newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]];
    onPhasesChange(newPhases.map((p, i) => ({ ...p, display_order: i + 1 })));
  };

  // ── VCR assignment ───────────────────────────────────────
  const handlePhaseAssign = (vcrId: string, phaseId: string) => {
    onVCRPhaseAssignmentsChange({ ...vcrPhaseAssignments, [vcrId]: phaseId });
  };

  const unassignedVCRs = vcrs.filter(v => !vcrPhaseAssignments[v.id]);
  const getPhaseVCRCount = (phaseId: string) => vcrs.filter(v => vcrPhaseAssignments[v.id] === phaseId).length;

  // ════════════════════════════════════════════════════════
  // SUB-STAGE: DEFINE PHASES
  // ════════════════════════════════════════════════════════
  const renderDefineStage = () => (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Define Handover Phases</h3>
          <p className="text-xs text-muted-foreground">
            Create phases when handovers are planned (e.g. Pre-TAR, TAR, Post-TAR)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{phases.length} phase{phases.length !== 1 ? 's' : ''}</Badge>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" /> Add Phase
          </Button>
        </div>
      </div>

      {/* Phase cards – horizontal layout */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2 min-h-[200px]">
          {phases.map((phase, index) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              index={index}
              total={phases.length}
              milestones={milestones}
              vcrCount={getPhaseVCRCount(phase.id)}
              onEdit={handleStartEdit}
              onDelete={handleDeletePhase}
              onMoveLeft={() => movePhase(index, 'left')}
              onMoveRight={() => movePhase(index, 'right')}
            />
          ))}

          {phases.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Milestone className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No phases defined yet</p>
              <p className="text-[11px] mt-1">Click "Add Phase" to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Flow indicator */}
      {phases.length > 1 && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          <span>Phases are executed left to right in sequence</span>
        </div>
      )}

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
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSubStage('define')}>
            <ArrowLeft className="h-3 w-3" /> Edit Phases
          </Button>
          <Badge
            variant="outline"
            className={cn(unassignedVCRs.length > 0 && 'bg-amber-50 text-amber-700 border-amber-200')}
          >
            {vcrs.length - unassignedVCRs.length}/{vcrs.length} assigned
          </Badge>
        </div>
      </div>

      {/* Phase timeline preview */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {phases.map((phase, index) => {
            const phaseVCRs = vcrs.filter(v => vcrPhaseAssignments[v.id] === phase.id);
            return (
              <div key={phase.id} className="min-w-[180px] flex-1 rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium truncate">{phase.name}</span>
                </div>
                {phaseVCRs.length > 0 ? (
                  <div className="space-y-1">
                    {phaseVCRs.map(vcr => (
                      <div key={vcr.id} className="flex items-center gap-1.5 p-1.5 rounded bg-background border text-[11px]">
                        <Key className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{vcr.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic py-2">No VCRs assigned</p>
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
        <ScrollArea className="max-h-[160px]">
          <div className="space-y-2 pr-2">
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
        </ScrollArea>
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

  return (
    <>
      {subStage === 'define' ? renderDefineStage() : renderAssignStage()}

      <PhaseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        milestones={milestones}
        editingPhase={editingPhase}
        onSave={editingPhase ? handleEditPhase : handleCreatePhase}
      />
    </>
  );
};
