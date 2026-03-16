import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Flame, AlertCircle, ArrowRight, ChevronDown, Box, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
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
  submissionComment?: string;
  onCommentChange?: (comment: string) => void;
}

export const WorkspacePreviewStep: React.FC<WorkspacePreviewStepProps> = ({
  systems,
  vcrs,
  phases,
  mappings,
  vcrPhaseAssignments,
  approvers = [],
  submissionComment = '',
  onCommentChange,
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

  const maxChars = 500;

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold">Plan Summary</h3>
        <p className="text-xs text-muted-foreground">
          Review your handover plan before submitting for approval
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: systems.length, label: 'Systems', accent: 'text-blue-600 dark:text-blue-400' },
          { value: vcrs.length, label: 'VCRs', accent: 'text-amber-600 dark:text-amber-400' },
          { value: activePhases.length, label: 'Phases', accent: 'text-emerald-600 dark:text-emerald-400' },
          { value: systems.filter(s => s.is_hydrocarbon).length, label: 'HC Systems', accent: 'text-orange-600 dark:text-orange-400' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border bg-card px-2 py-1.5 text-center">
            <div className={cn('text-lg font-bold tabular-nums leading-tight', stat.accent)}>{stat.value}</div>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
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
                    <div className="rounded-lg border bg-card p-3 min-w-[150px] min-h-[120px] flex-1 group/phase">
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
                            <div key={vcr.id} className="transition-opacity duration-150 group-hover/phase:opacity-40 hover:!opacity-100">
                              <HoverCard openDelay={200} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <div
                                    className="rounded-md px-2 py-1.5 flex items-center justify-between gap-1 border cursor-default transition-shadow hover:shadow-md"
                                    style={{
                                      background: vcrColor?.background,
                                      borderColor: vcrColor?.border,
                                    }}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-medium truncate">{vcr.name}</div>
                                      <div className="text-[9px] text-muted-foreground font-mono">{shortVCRCode(vcr.code)}</div>
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
                                </HoverCardTrigger>
                                <HoverCardContent
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                  collisionPadding={16}
                                  avoidCollisions
                                  className="w-56 p-2 rounded-xl shadow-xl border overflow-hidden z-[100] max-h-48 overflow-y-auto"
                                >
                                  {vcrSystems.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground text-center py-2">No systems mapped</p>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {vcrSystems.map(sys => (
                                        <div key={sys.id}>
                                          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted/50">
                                            <Box className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="text-[11px] font-medium truncate flex-1">{sys.name}</span>
                                            {sys.is_hydrocarbon && (
                                              <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                                            )}
                                          </div>
                                          {sys.subsystems && sys.subsystems.length > 0 && (
                                            <div className="ml-5 space-y-0.5">
                                              {sys.subsystems
                                                .filter(sub => {
                                                  const keys = mappings[vcr.id] || [];
                                                  return keys.includes(`${sys.id}::sub::${sub.system_id}`);
                                                })
                                                .map(sub => (
                                                  <div key={sub.system_id} className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                                    <span className="truncate">{sub.name}</span>
                                                  </div>
                                                ))
                                              }
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

        {/* Warnings */}
        {unassignedVCRs.length > 0 && (
          <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
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

        {unmappedSystems.length > 0 && (
          <Collapsible open={unmappedOpen} onOpenChange={setUnmappedOpen}>
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

        {/* Approvers — 3-column grid */}
        {approvers.length > 0 && (
          <>
            <Separator />
            <section>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 block">
                Selected Approvers
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1">
                {approvers.map((approver) => {
                  const avatarUrl = approver.user_avatar
                    ? (approver.user_avatar.startsWith('http')
                        ? approver.user_avatar
                        : supabase.storage.from('user-avatars').getPublicUrl(approver.user_avatar).data.publicUrl)
                    : undefined;
                  const initials = approver.user_name
                    ? approver.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?';
                  const hasUser = !!approver.user_id;

                  const badgeClass = !hasUser
                    ? 'bg-muted-foreground'
                    : approver.status === 'APPROVED'
                      ? 'bg-emerald-500'
                      : approver.status === 'REJECTED'
                        ? 'bg-destructive'
                        : 'bg-amber-500';

                  const BadgeIcon = !hasUser
                    ? AlertCircle
                    : approver.status === 'APPROVED'
                      ? CheckCircle2
                      : approver.status === 'REJECTED'
                        ? XCircle
                        : Clock;

                  return (
                    <div key={approver.id} className="flex items-center gap-2.5 py-2">
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="text-[9px] bg-muted font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background flex items-center justify-center",
                          badgeClass
                        )}>
                          <BadgeIcon className="h-2 w-2 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        {hasUser ? (
                          <>
                            <p className="text-xs font-medium truncate">{approver.user_name}</p>
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

        {/* Notes for Approvers — full-width row above footer */}
        {onCommentChange && (
          <>
            <Separator />
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="submission-comment" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes for Approvers
                </Label>
                <span className="text-[10px] text-muted-foreground ml-auto">(optional)</span>
              </div>
              <Textarea
                id="submission-comment"
                placeholder="Add any context, instructions, or key decisions for the approval team..."
                value={submissionComment}
                onChange={(e) => onCommentChange(e.target.value.slice(0, maxChars))}
                className="min-h-[80px] text-xs resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className={cn(
                  "text-[10px] tabular-nums",
                  submissionComment.length >= maxChars ? "text-destructive" : "text-muted-foreground"
                )}>
                  {submissionComment.length}/{maxChars}
                </span>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
