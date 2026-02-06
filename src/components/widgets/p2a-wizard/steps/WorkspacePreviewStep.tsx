import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Box, Key, Milestone, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';
import { WizardPhase } from './VCRSequencingStep';

interface WorkspacePreviewStepProps {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  mappings: Record<string, string[]>;
  vcrPhaseAssignments: Record<string, string>;
  onOpenFullWorkspace?: () => void;
}

export const WorkspacePreviewStep: React.FC<WorkspacePreviewStepProps> = ({
  systems,
  vcrs,
  phases,
  mappings,
  vcrPhaseAssignments,
  onOpenFullWorkspace,
}) => {
  const getPhaseVCRs = (phaseId: string) => {
    return vcrs.filter(vcr => vcrPhaseAssignments[vcr.id] === phaseId);
  };

  const getVCRSystems = (vcrId: string) => {
    const systemIds = mappings[vcrId] || [];
    return systems.filter(s => systemIds.includes(s.id));
  };

  const unassignedVCRs = vcrs.filter(vcr => !vcrPhaseAssignments[vcr.id]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Handover Plan Preview</h3>
          <p className="text-xs text-muted-foreground">
            Visual overview of your P2A Handover Plan
          </p>
        </div>
        {onOpenFullWorkspace && (
          <Button variant="outline" size="sm" onClick={onOpenFullWorkspace}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Workspace
          </Button>
        )}
      </div>

      <ScrollArea className="h-[300px] border rounded-lg">
        <div className="p-4">
          {/* Phase-based timeline visualization */}
          <div className="space-y-6">
            {phases.map((phase, phaseIndex) => {
              const phaseVCRs = getPhaseVCRs(phase.id);
              if (phaseVCRs.length === 0) return null;

              return (
                <div key={phase.id} className="relative">
                  {/* Phase Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      {phaseIndex + 1}
                    </div>
                    <div>
                      <div className="font-medium">{phase.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {phaseVCRs.length} VCR{phaseVCRs.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* VCRs in this phase */}
                  <div className="ml-10 space-y-3">
                    {phaseVCRs.map((vcr) => {
                      const vcrSystems = getVCRSystems(vcr.id);
                      return (
                        <div
                          key={vcr.id}
                          className="border rounded-lg overflow-hidden bg-card"
                        >
                          {/* VCR Header */}
                          <div className="flex items-center gap-2 p-3 bg-primary/5 border-b">
                            <Key className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{vcr.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {vcr.code}
                            </span>
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {vcrSystems.length} systems
                            </Badge>
                          </div>

                          {/* Mapped Systems */}
                          {vcrSystems.length > 0 && (
                            <div className="p-2 grid grid-cols-2 gap-1">
                              {vcrSystems.map((system) => (
                                <div
                                  key={system.id}
                                  className="flex items-center gap-2 p-2 rounded bg-muted/30 text-xs"
                                >
                                  <Box className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{system.name}</span>
                                  {system.is_hydrocarbon && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200">
                                      HC
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Connector to next phase */}
                  {phaseIndex < phases.length - 1 && getPhaseVCRs(phases[phaseIndex + 1]?.id).length > 0 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned VCRs */}
            {unassignedVCRs.length > 0 && (
              <div className="pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Unassigned VCRs
                </div>
                <div className="space-y-2">
                  {unassignedVCRs.map((vcr) => (
                    <div
                      key={vcr.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-dashed bg-amber-50/50 dark:bg-amber-950/20"
                    >
                      <Key className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">{vcr.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {vcr.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {vcrs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Milestone className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No VCRs created yet</p>
              <p className="text-xs mt-1">Go back to add systems and VCRs</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-lg font-bold text-primary">{systems.length}</div>
          <div className="text-xs text-muted-foreground">Systems</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-lg font-bold text-primary">{vcrs.length}</div>
          <div className="text-xs text-muted-foreground">VCRs</div>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 text-center">
          <div className="text-lg font-bold text-primary">
            {phases.filter(p => getPhaseVCRs(p.id).length > 0).length}
          </div>
          <div className="text-xs text-muted-foreground">Active Phases</div>
        </div>
      </div>
    </div>
  );
};
