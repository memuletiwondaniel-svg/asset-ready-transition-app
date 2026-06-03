import React, { useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCircle2, Clock, X as XIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useP2AApproverRoster } from '@/hooks/useP2AApproverRoster';
import type { WizardApprover } from './steps/ApprovalSetupStep';
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

type ApprovalStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

const statusStyles: Record<ApprovalStatus, { icon: React.ComponentType<{ className?: string }>; label: string; cls: string }> = {
  APPROVED: { icon: Check, label: 'Approved', cls: 'text-emerald-600 dark:text-emerald-400' },
  REJECTED: { icon: XIcon, label: 'Rejected', cls: 'text-destructive' },
  PENDING:  { icon: Clock, label: 'Pending',  cls: 'text-amber-600 dark:text-amber-400' },
};

export const SubmissionSuccessDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  planId,
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
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onDone();
      return;
    }
    onOpenChange(nextOpen);
  };

  const { data: profileUsers } = useProfileUsers();
  const fixedRoleLabels = useMemo(() => FIXED_APPROVER_ROLES.map((role) => role.label), []);
  const { data: resolvedProjectRoles } = useProjectRoleUsers(projectId, fixedRoleLabels);

  const savedApprovers = useMemo(
    () => approvers.filter(a => !!a.user_id).sort((a, b) => a.display_order - b.display_order),
    [approvers]
  );

  const canonicalFallbackApprovers = useMemo<WizardApprover[]>(() => {
    if (!resolvedProjectRoles) return [];
    return FIXED_APPROVER_ROLES.map((role) => {
      const resolved = resolvedProjectRoles[role.label];
      return {
        id: `fallback-${role.key}`,
        role_name: role.label,
        display_order: role.order,
        status: 'PENDING',
        user_id: resolved?.user_id,
        user_name: resolved?.full_name || 'Not assigned',
        user_avatar: resolved?.avatar_url ?? undefined,
      };
    });
  }, [resolvedProjectRoles]);

  const assignedApprovers = savedApprovers.length > 0 ? savedApprovers : canonicalFallbackApprovers;
  const assignedRows = useMemo(() => assignedApprovers.filter(a => !!a.user_id), [assignedApprovers]);
  const unassignedRows = useMemo(() => assignedApprovers.filter(a => !a.user_id), [assignedApprovers]);

  const statusByApproverId = useMemo(() => {
    const m = new Map<string, ApprovalStatus>();
    assignedApprovers.forEach(a => {
      const s = ((a as any).status || 'PENDING').toUpperCase();
      m.set(a.id, (s === 'APPROVED' || s === 'REJECTED' ? s : 'PENDING') as ApprovalStatus);
    });
    return m;
  }, [assignedApprovers]);

  const approverPartner = useMemo(() => {
    const map = new Map<string, { full_name: string } | null>();
    if (!profileUsers) return map;
    assignedApprovers.forEach(a => {
      const me = profileUsers.find((u: any) => u.user_id === a.user_id);
      const myPos = normalize(me?.position);
      if (!myPos) { map.set(a.id, null); return; }
      const sharing = profileUsers.filter((u: any) => normalize(u.position) === myPos);
      const others = sharing.filter((u: any) => u.user_id !== a.user_id);
      map.set(a.id, sharing.length === 2 && others.length === 1 ? { full_name: others[0].full_name } : null);
    });
    return map;
  }, [profileUsers, assignedApprovers]);

  const taskCount = assignedApprovers.filter(a => !!a.user_id).length;
  const approvedCount = assignedApprovers.filter(a => !!a.user_id && statusByApproverId.get(a.id) === 'APPROVED').length;
  const hcCount = systems.filter(s => (s as any).is_hydrocarbon).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex flex-col items-center text-center px-6 pt-6 pb-3">
          <div className="h-11 w-11 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold">Submitted for approval</h2>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {projectCode}{projectName ? ` · ${projectName}` : ''}
          </p>
        </div>

        {/* Roster — always visible */}
        <div className="mx-6 mb-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium flex-1">
              {taskCount} approval {taskCount === 1 ? 'task' : 'tasks'} created and assigned
            </span>
            {taskCount > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {approvedCount}/{taskCount} approved
              </span>
            )}
          </div>

          <div className="px-3 py-2 max-h-72 overflow-y-auto">
            <div className="space-y-2">
              {assignedRows.map(a => {
                const partner = approverPartner.get(a.id);
                const status: ApprovalStatus = statusByApproverId.get(a.id) ?? 'PENDING';
                const S = statusStyles[status];
                return (
                  <div key={a.id} className="flex items-center gap-3 text-sm py-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate leading-tight">{a.user_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.role_name}</div>
                    </div>
                    {partner && (
                      <span
                        className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0"
                        title={`Either partner can approve: ${a.user_name} or ${partner.full_name}`}
                      >
                        B2B
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-normal shrink-0',
                        status === 'APPROVED' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
                        status === 'REJECTED' && 'bg-destructive/10 text-destructive border-destructive/30',
                        status === 'PENDING'  && 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {S.label}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {unassignedRows.length > 0 && (
              <>
                <div className="my-2 border-t border-dashed border-border" />
                <div className="space-y-2">
                  {unassignedRows.map(a => (
                    <div key={a.id} className="flex items-center gap-3 text-sm py-0.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate leading-tight">{a.role_name}</div>
                        <div className="text-xs text-muted-foreground truncate">no holder assigned</div>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-0.5 text-xs font-normal shrink-0 bg-destructive/10 text-destructive border-destructive/30 gap-1"
                      >
                        <XIcon className="h-3 w-3" />
                        Not assigned
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {assignedRows.length === 0 && unassignedRows.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No approvers assigned.</p>
            )}
          </div>
        </div>

        <div className="px-6 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
          >
            Pending approval
          </Badge>
        </div>

        <div className="mx-6 mt-3 pt-3 border-t border-border flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground tabular-nums">
          <span>{systems.length} systems</span>
          <span className="opacity-40">·</span>
          <span>{vcrs.length} VCRs</span>
          <span className="opacity-40">·</span>
          <span>{phases.length} phases</span>
          <span className="opacity-40">·</span>
          <span>{hcCount} HC</span>
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
