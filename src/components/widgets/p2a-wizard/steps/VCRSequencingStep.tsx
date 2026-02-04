import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Milestone, ArrowDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from './VCRCreationStep';

export interface WizardPhase {
  id: string;
  name: string;
  display_order: number;
}

const DEFAULT_PHASES: WizardPhase[] = [
  { id: 'phase-1', name: 'Mechanical Completion', display_order: 1 },
  { id: 'phase-2', name: 'Pre-Commissioning', display_order: 2 },
  { id: 'phase-3', name: 'Commissioning', display_order: 3 },
  { id: 'phase-4', name: 'Performance Testing', display_order: 4 },
  { id: 'phase-5', name: 'Ready for Startup', display_order: 5 },
];

interface VCRSequencingStepProps {
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  vcrPhaseAssignments: Record<string, string>; // vcrId -> phaseId
  vcrOrder: string[]; // ordered vcr IDs
  onPhasesChange: (phases: WizardPhase[]) => void;
  onVCRPhaseAssignmentsChange: (assignments: Record<string, string>) => void;
  onVCROrderChange: (order: string[]) => void;
}

export const VCRSequencingStep: React.FC<VCRSequencingStepProps> = ({
  vcrs,
  phases,
  vcrPhaseAssignments,
  vcrOrder,
  onPhasesChange,
  onVCRPhaseAssignmentsChange,
  onVCROrderChange,
}) => {
  // Initialize phases if empty
  React.useEffect(() => {
    if (phases.length === 0) {
      onPhasesChange(DEFAULT_PHASES);
    }
  }, [phases.length, onPhasesChange]);

  // Initialize order if empty
  React.useEffect(() => {
    if (vcrOrder.length === 0 && vcrs.length > 0) {
      onVCROrderChange(vcrs.map(v => v.id));
    }
  }, [vcrs, vcrOrder.length, onVCROrderChange]);

  const handlePhaseChange = (vcrId: string, phaseId: string) => {
    onVCRPhaseAssignmentsChange({
      ...vcrPhaseAssignments,
      [vcrId]: phaseId,
    });
  };

  const getPhaseVCRs = (phaseId: string) => {
    return vcrs.filter(vcr => vcrPhaseAssignments[vcr.id] === phaseId);
  };

  const unassignedVCRs = vcrs.filter(vcr => !vcrPhaseAssignments[vcr.id]);

  if (vcrs.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="py-12 text-muted-foreground">
          <Milestone className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Create VCRs first to sequence them</p>
        </div>
      </div>
    );
  }

  const displayPhases = phases.length > 0 ? phases : DEFAULT_PHASES;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Sequence VCRs by Phase</h3>
          <p className="text-xs text-muted-foreground">
            Assign VCRs to project phases to establish sequence
          </p>
        </div>
        <Badge variant="outline" className={cn(
          unassignedVCRs.length > 0 && "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {vcrs.length - unassignedVCRs.length}/{vcrs.length} assigned
        </Badge>
      </div>

      <ScrollArea className="h-[340px]">
        <div className="space-y-3">
          {/* Phase Timeline */}
          {displayPhases.map((phase, index) => {
            const phaseVCRs = getPhaseVCRs(phase.id);
            return (
              <div key={phase.id} className="relative">
                {/* Phase Header */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <Milestone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm flex-1">{phase.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {phaseVCRs.length} VCRs
                  </Badge>
                </div>

                {/* VCRs in this phase */}
                {phaseVCRs.length > 0 && (
                  <div className="ml-8 mt-2 space-y-1">
                    {phaseVCRs.map((vcr) => (
                      <div
                        key={vcr.id}
                        className="flex items-center gap-2 p-2 rounded border bg-card"
                      >
                        <Key className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm flex-1">{vcr.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {vcr.code}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connector */}
                {index < displayPhases.length - 1 && (
                  <div className="absolute left-[23px] top-12 h-4 w-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* VCR Assignment */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Assign VCRs to Phases
        </div>
        <div className="space-y-2">
          {vcrs.map((vcr) => (
            <div key={vcr.id} className="flex items-center gap-3">
              <Key className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">{vcr.name}</span>
              <Select
                value={vcrPhaseAssignments[vcr.id] || ''}
                onValueChange={(value) => handlePhaseChange(vcr.id, value)}
              >
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Select phase..." />
                </SelectTrigger>
                <SelectContent>
                  {displayPhases.map((phase) => (
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
};
