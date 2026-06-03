import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, ExternalLink, CircleDashed, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useP2AApproverRoster } from '@/hooks/useP2AApproverRoster';
import { FIXED_APPROVER_ROLES, type WizardApprover } from './steps/ApprovalSetupStep';
import type { WizardSystem } from './steps/SystemsImportStep';
import type { WizardVCR } from './steps/VCRCreationStep';
import type { WizardPhase } from './steps/PhasesStep';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId?: string;
  projectId?: string;
  projectCode: string;
  projectName?: string;
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  approvers: WizardApprover[];
  onDone: () => void;
  onOpenWorkspace?: () => void;
}

const normalize = (p?: string | null) => (p || '').toLowerCase().replace(/\s+/g, ' ').trim();

type ApprovalStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'UPCOMING';

const statusStyles: Record<ApprovalStatus, { label: string; cls: string }> = {
  APPROVED: { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  REJECTED: { label: 'Rejected', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  PENDING:  { label: 'Pending',  cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  UPCOMING: { label: 'Upcoming', cls: 'bg-muted text-muted-foreground border-border' },
};

const getInitials = (name?: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

export const SubmissionSuccessDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  projectId,
  projectCode,
  projectName,
  systems,
  vcrs,
  phases,
  approvers,
  onDone,
  onOpenWorkspace,
}) => {
  // Read-only submission view: deputy row always shows the assigned holder; no swap state.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) { onDone(); return; }
    onOpenChange(nextOpen);
  };

  const { data: profileUsers } = useProfileUsers();
  const { roster, isLoading: rosterLoading } = useP2AApproverRoster(projectId);

  // Status by role_name from persisted approver rows (real tasks).
  const statusByRole = useMemo(() => {
    const m = new Map<string, ApprovalStatus>();
    approvers.forEach((a) => {
      if (!a.user_id) return;
      const s = ((a as any).status || 'PENDING').toUpperCase();
      m.set(a.role_name, (s === 'APPROVED' || s === 'REJECTED' ? s : 'PENDING') as ApprovalStatus);
    });
    return m;
  }, [approvers]);

  // Build full 5-stage view from canonical roster; fall back to roles when roster is still loading.
  const stages = useMemo(() => {
    const source: WizardApprover[] =
      roster.length > 0
        ? roster
        : FIXED_APPROVER_ROLES.map((r) => ({
            id: `approver-${r.key}`,
            role_name: r.label,
            display_order: r.order,
            status: 'PENDING' as const,
          }));

    return source
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((a) => {
        const meta = FIXED_APPROVER_ROLES.find((r) => r.label === a.role_name);
        const status: ApprovalStatus = statusByRole.get(a.role_name) ?? 'UPCOMING';
        return { approver: a, stageNum: meta?.order ?? a.display_order, phase: meta?.phase ?? 1, status };
      });
  }, [roster, statusByRole]);

  // Deputy B2B partner detection (same logic as before, now driven by roster).
  const partnerByRole = useMemo(() => {
    const map = new Map<string, { full_name: string; avatar_url?: string | null; user_id?: string } | null>();
    if (!profileUsers) return map;
    stages.forEach(({ approver }) => {
      if (!approver.user_id) { map.set(approver.role_name, null); return; }
      const me = profileUsers.find((u: any) => u.user_id === approver.user_id);
      const myPos = normalize(me?.position);
      if (!myPos) { map.set(approver.role_name, null); return; }
      const sharing = profileUsers.filter((u: any) => normalize(u.position) === myPos);
      const others = sharing.filter((u: any) => u.user_id !== approver.user_id);
      map.set(
        approver.role_name,
        sharing.length === 2 && others.length === 1
          ? { full_name: others[0].full_name, avatar_url: others[0].avatar_url, user_id: others[0].user_id }
          : null
      );
    });
    return map;
  }, [profileUsers, stages]);

  const totalAssigned = stages.filter(s => !!s.approver.user_id).length;
  const approvedCount = stages.filter(s => s.status === 'APPROVED').length;
  const activeStageIndex = stages.findIndex(s => s.status === 'PENDING');
  

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <div className="flex flex-col items-center text-center px-8 pt-4 pb-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Submitted for approval</h2>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {projectCode}{projectName ? ` · ${projectName}` : ''}
          </p>
        </div>

        <div className="mx-8 mb-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <span className="text-sm font-medium flex-1 text-muted-foreground">
              {totalAssigned} assigned
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {approvedCount}/{stages.length} approved
            </span>
          </div>

          <div className="px-4 py-3 max-h-96 overflow-y-auto">
            {rosterLoading && stages.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Loading approvers…</p>
            ) : (
              <TooltipProvider delayDuration={150}>
                <div className="space-y-4">
                  {stages.map(({ approver, stageNum, status }, idx) => {
                    const partner = partnerByRole.get(approver.role_name);
                    const S = statusStyles[status];
                    const hasUser = !!approver.user_id;
                    const swapped = !!swappedRoles[approver.role_name];
                    const displayName = swapped && partner ? partner.full_name : approver.user_name;
                    const displayAvatar = swapped && partner ? partner.avatar_url : approver.user_avatar;
                    const isActive = idx === activeStageIndex;
                    const isApproved = status === 'APPROVED' || status === 'REJECTED';
                    const isUpcoming = !isActive && !isApproved;
                    return (
                      <div
                        key={approver.id}
                        className={cn(
                          'flex items-center gap-3 text-sm transition-opacity',
                          isUpcoming && 'opacity-50',
                        )}
                      >
                        <span
                          className={cn(
                            'text-xs tabular-nums w-5 shrink-0 text-center',
                            isActive ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground',
                          )}
                        >
                          {stageNum}
                        </span>
                        <Avatar
                          key={`${approver.role_name}-${swapped ? 'p' : 'm'}`}
                          className={cn(
                            'h-9 w-9 shrink-0',
                            isActive && 'ring-2 ring-amber-500/40 ring-offset-2 ring-offset-background',
                          )}
                        >
                          <AvatarImage src={resolveAvatarUrl(displayAvatar)} alt={displayName || approver.role_name} />
                          <AvatarFallback className="text-[10px]">
                            {hasUser ? getInitials(displayName) : <CircleDashed className="h-3.5 w-3.5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                'truncate leading-tight',
                                isActive ? 'font-semibold text-foreground' : 'font-medium',
                              )}
                            >
                              {hasUser ? displayName : approver.role_name}
                            </span>
                            {partner && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSwappedRoles((prev) => ({
                                        ...prev,
                                        [approver.role_name]: !prev[approver.role_name],
                                      }));
                                    }}
                                    className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 hover:bg-amber-200 dark:hover:bg-amber-900/60 cursor-pointer transition-colors"
                                    title={`Click to switch to B2B: ${swapped ? approver.user_name : partner.full_name}`}
                                  >
                                    B2B
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs">
                                  Click to switch to B2B: {swapped ? approver.user_name : partner.full_name}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {hasUser ? approver.role_name : 'no holder assigned'}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs shrink-0',
                            hasUser ? S.cls : statusStyles.REJECTED.cls,
                            isActive ? 'font-medium shadow-sm' : 'font-normal',
                          )}
                        >
                          {hasUser ? S.label : 'Not assigned'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>


        <div className="px-8 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
          >
            Pending approval
          </Badge>
        </div>

        <div className="mx-8 mt-3 pt-3 border-t border-border flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground tabular-nums">
          <span>{systems.length} systems</span>
          <span className="opacity-40">·</span>
          <span>{vcrs.length} VCRs</span>
          <span className="opacity-40">·</span>
          <span>{phases.length} phases</span>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 mt-4">
          {onOpenWorkspace && (
            <Button className="w-full gap-1.5" onClick={onOpenWorkspace}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open workspace
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
