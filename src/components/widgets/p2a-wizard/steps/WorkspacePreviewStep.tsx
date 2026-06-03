import React, { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';
import { WizardPhase } from './PhasesStep';
import { WizardApprover } from './ApprovalSetupStep';
import { shortVCRCode } from './phases/vcrDisplayUtils';

interface WorkspacePreviewStepProps {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  mappings: Record<string, string[]>;
  vcrPhaseAssignments: Record<string, string>;
  approvers?: WizardApprover[];
}

const HCPill: React.FC<{ className?: string; label?: string }> = ({ className, label = 'Hydrocarbon' }) => (
  <span
    title={label}
    className={cn(
      'inline-flex items-center rounded px-1.5 h-4 text-[9px] font-medium tabular-nums',
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
      className,
    )}
  >
    HC
  </span>
);

export const WorkspacePreviewStep: React.FC<WorkspacePreviewStepProps> = ({
  systems,
  vcrs,
  phases,
  mappings,
  vcrPhaseAssignments,
  approvers = [],
}) => {
  const [unmappedOpen, setUnmappedOpen] = useState(false);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const { data: allProfileUsers } = useProfileUsers();

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
  const hcSystemCount = systems.filter(s => s.is_hydrocarbon).length;

  const normalize = (p?: string | null) => (p || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const resolvePartner = (userId?: string) => {
    if (!userId || !allProfileUsers) return null;
    const me = (allProfileUsers as any[]).find(u => u.user_id === userId);
    const myPos = normalize(me?.position);
    if (!myPos) return null;
    const sharing = (allProfileUsers as any[]).filter(u => normalize(u.position) === myPos);
    if (sharing.length !== 2) return null;
    const other = sharing.find(u => u.user_id !== userId);
    return other ?? null;
  };

  const stats: Array<{ value: number; label: string; hc?: boolean }> = [
    { value: systems.length, label: 'Systems' },
    { value: vcrs.length, label: 'VCRs' },
    { value: activePhases.length, label: 'Phases' },
    { value: hcSystemCount, label: 'HC Systems', hc: true },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold">Plan Summary</h3>
        <p className="text-xs text-muted-foreground">
          Review your handover plan before submitting for approval
        </p>
      </div>

      {/* Stats Row — neutral, except HC card carries the amber key */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(stat => (
          <div
            key={stat.label}
            className={cn(
              'rounded-lg border px-2 py-1.5 text-center',
              stat.hc
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-border bg-card',
            )}
          >
            <div
              className={cn(
                'text-lg font-semibold tabular-nums leading-tight',
                stat.hc ? 'text-amber-700 dark:text-amber-300' : 'text-foreground',
              )}
            >
              {stat.value}
            </div>
            <div
              className={cn(
                'text-[9px] font-medium uppercase tracking-wider',
                stat.hc ? 'text-amber-700/80 dark:text-amber-300/80' : 'text-muted-foreground',
              )}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-4">
        {/* Phase Flow */}
        <div>
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
                    <div className="rounded-lg border border-border bg-card p-3 min-w-[150px] min-h-[120px] flex-1 group/phase">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-semibold text-muted-foreground/60 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold truncate">{phase.name}</span>
                      </div>
                      <div className="space-y-1.5">
                        {phaseVCRs.map(vcr => {
                          const vcrSystems = getVCRSystems(vcr.id);
                          const hcCount = vcrSystems.filter(s => s.is_hydrocarbon).length;
                          return (
                            <div
                              key={vcr.id}
                              className="transition-opacity duration-150 group-hover/phase:opacity-40 hover:!opacity-100"
                            >
                              <HoverCard openDelay={200} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <div className="rounded-md px-2 py-1.5 flex items-center justify-between gap-2 border border-border bg-background cursor-default transition-colors hover:bg-muted/40">
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-medium truncate">{vcr.name}</div>
                                      <div className="text-[9px] text-muted-foreground font-mono">
                                        {shortVCRCode(vcr.code)} · {vcrSystems.length} {vcrSystems.length === 1 ? 'system' : 'systems'}
                                      </div>
                                    </div>
                                    {hcCount > 0 && <HCPill label={`${hcCount} hydrocarbon ${hcCount === 1 ? 'system' : 'systems'}`} />}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                  collisionPadding={16}
                                  avoidCollisions
                                  className="w-60 p-2 rounded-xl shadow-xl border overflow-hidden z-[100] max-h-48 overflow-y-auto"
                                >
                                  {vcrSystems.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground text-center py-2">
                                      No systems mapped
                                    </p>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {vcrSystems.map(sys => (
                                        <div key={sys.id}>
                                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted/50">
                                            <span className="text-[11px] font-medium truncate flex-1">{sys.name}</span>
                                            {sys.is_hydrocarbon && <HCPill />}
                                          </div>
                                          {sys.subsystems && sys.subsystems.length > 0 && (
                                            <div className="ml-3 space-y-0.5">
                                              {sys.subsystems
                                                .filter(sub => {
                                                  const keys = mappings[vcr.id] || [];
                                                  return keys.includes(`${sys.id}::sub::${sub.system_id}`);
                                                })
                                                .map(sub => (
                                                  <div
                                                    key={sub.system_id}
                                                    className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                                  >
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                                    <span className="truncate">{sub.name}</span>
                                                  </div>
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </HoverCardContent>
                              </HoverCard>
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
        </div>

        {/* Calm single-line warnings */}
        {unassignedVCRs.length > 0 && (
          <Collapsible open={unassignedOpen} onOpenChange={setUnassignedOpen}>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {unassignedVCRs.length} unassigned VCR{unassignedVCRs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-amber-600/70 dark:text-amber-400/70 transition-transform',
                    unassignedOpen && 'rotate-180',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 flex flex-wrap gap-1">
                  {unassignedVCRs.map(vcr => (
                    <span
                      key={vcr.id}
                      className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded px-1.5 py-0.5"
                    >
                      {vcr.name}
                    </span>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {unmappedSystems.length > 0 && (
          <Collapsible open={unmappedOpen} onOpenChange={setUnmappedOpen}>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {unmappedSystems.length} unmapped system{unmappedSystems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-amber-600/70 dark:text-amber-400/70 transition-transform',
                    unmappedOpen && 'rotate-180',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 flex flex-wrap gap-1">
                  {unmappedSystems.map(sys => (
                    <span
                      key={sys.id}
                      className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded px-1.5 py-0.5"
                    >
                      {sys.name}
                    </span>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Approvers — clean: avatar + name + role; B2B pill when applicable */}
        {approvers.length > 0 && (
          <>
            <Separator />
            <section>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 block">
                Selected Approvers
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
                {approvers.map(approver => {
                  const avatarUrl = approver.user_avatar
                    ? approver.user_avatar.startsWith('http')
                      ? approver.user_avatar
                      : supabase.storage.from('user-avatars').getPublicUrl(approver.user_avatar).data.publicUrl
                    : undefined;
                  const initials = approver.user_name
                    ? approver.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?';
                  const hasUser = !!approver.user_id;
                  const partner = hasUser ? resolvePartner(approver.user_id) : null;

                  return (
                    <div key={approver.id} className="flex items-center gap-2.5 py-1">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-[9px] bg-muted font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        {hasUser ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium truncate">{approver.user_name}</p>
                              {partner && (
                                <TooltipProvider delayDuration={150}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[9px] font-semibold tracking-wider px-1 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                        B2B
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs">
                                      Back-to-back with {(partner as any).full_name}. Either can approve.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{approver.role_name}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-muted-foreground truncate">{approver.role_name}</p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">Unassigned</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
