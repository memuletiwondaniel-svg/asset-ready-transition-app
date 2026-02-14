import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExternalLink, Flame, AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';
import { WizardPhase } from './PhasesStep';

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
  const [unmappedOpen, setUnmappedOpen] = useState(false);

  const getPhaseVCRs = (phaseId: string) =>
    vcrs.filter(vcr => vcrPhaseAssignments[vcr.id] === phaseId);

  const getVCRSystems = (vcrId: string) => {
    const keys = mappings[vcrId] || [];
    return systems.filter(s =>
      keys.includes(s.id) || keys.some(k => k.startsWith(s.id + '::sub::'))
    );
  };

  const mappedSystemIds = new Set(
    Object.values(mappings).flat().map(k => k.split('::sub::')[0])
  );
  const unmappedSystems = systems.filter(s => !mappedSystemIds.has(s.id));
  const unassignedVCRs = vcrs.filter(vcr => !vcrPhaseAssignments[vcr.id]);
  const activePhases = phases.filter(p => getPhaseVCRs(p.id).length > 0);

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Plan Summary</h3>
          <p className="text-xs text-muted-foreground">
            Review your handover plan before proceeding
          </p>
        </div>
        {onOpenFullWorkspace && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFullWorkspace}
            className="text-xs h-7 px-2.5 gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Workspace
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: systems.length, label: 'Systems', accent: 'text-blue-600 dark:text-blue-400' },
          { value: vcrs.length, label: 'VCRs', accent: 'text-amber-600 dark:text-amber-400' },
          { value: activePhases.length, label: 'Phases', accent: 'text-emerald-600 dark:text-emerald-400' },
          { value: systems.filter(s => s.is_hydrocarbon).length, label: 'HC Systems', accent: 'text-orange-600 dark:text-orange-400' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border bg-card p-2.5 text-center">
            <div className={cn('text-xl font-bold tabular-nums', stat.accent)}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Phase Flow — horizontal timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
          Delivery Sequence
        </span>

        {activePhases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activePhases.map((phase, idx) => {
              const phaseVCRs = getPhaseVCRs(phase.id);
              return (
                <React.Fragment key={phase.id}>
                  {idx > 0 && (
                    <div className="flex items-center self-stretch">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="rounded-lg border bg-card p-3 min-w-[150px] min-h-[120px] flex-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-muted-foreground/60">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold truncate">{phase.name}</span>
                    </div>
                    <div className="space-y-1.5">
                      {phaseVCRs.map(vcr => {
                        const vcrSystems = getVCRSystems(vcr.id);
                        const hcCount = vcrSystems.filter(s => s.is_hydrocarbon).length;
                        const vcrColor = getVCRColor(vcr.code);
                        return (
                          <div
                            key={vcr.id}
                            className="rounded-md px-2 py-1.5 flex items-center justify-between gap-1 border"
                            style={{
                              background: vcrColor?.background,
                              borderColor: vcrColor?.border,
                            }}
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-medium truncate">{vcr.name}</div>
                              <div className="text-[9px] text-muted-foreground font-mono">{vcr.code}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {hcCount > 0 && (
                                <Flame className="h-3 w-3 text-orange-500" />
                              )}
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {vcrSystems.length}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-xs">No phases with assigned VCRs yet</p>
          </div>
        )}

        {/* Unassigned VCRs warning */}
        {unassignedVCRs.length > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {unassignedVCRs.length} unassigned VCR{unassignedVCRs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {unassignedVCRs.map(vcr => (
                <span key={vcr.id} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded px-1.5 py-0.5">
                  {vcr.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unmapped systems — expandable */}
        {unmappedSystems.length > 0 && (
          <Collapsible open={unmappedOpen} onOpenChange={setUnmappedOpen} className="mt-3">
            <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {unmappedSystems.length} unmapped system{unmappedSystems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-amber-500 transition-transform",
                  unmappedOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 flex flex-wrap gap-1">
                  {unmappedSystems.map(sys => (
                    <span key={sys.id} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded px-1.5 py-0.5">
                      {sys.name}
                    </span>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>
    </div>
  );
};
