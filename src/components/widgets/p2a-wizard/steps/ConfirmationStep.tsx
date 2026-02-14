import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Box, 
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  UserCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';
import { WizardPhase } from './PhasesStep';
import { WizardApprover } from './ApprovalSetupStep';
import { shortVCRCode } from './phases/vcrDisplayUtils';

interface ConfirmationStepProps {
  projectCode: string;
  projectName?: string;
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  approvers: WizardApprover[];
  mappings: Record<string, string[]>;
  vcrPhaseAssignments: Record<string, string>;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  projectCode,
  projectName,
  systems,
  vcrs,
  phases,
  approvers,
  mappings,
  vcrPhaseAssignments,
}) => {
  const assignedSystemsCount = new Set(Object.values(mappings).flat()).size;
  const assignedVCRsCount = Object.keys(vcrPhaseAssignments).length;
  
  const issues: string[] = [];
  if (systems.length === 0) issues.push('No systems added');
  if (vcrs.length === 0) issues.push('No VCRs created');
  if (assignedVCRsCount < vcrs.length) issues.push(`${vcrs.length - assignedVCRsCount} VCRs not assigned to phases`);
  if (assignedSystemsCount < systems.length) issues.push(`${systems.length - assignedSystemsCount} systems not mapped to VCRs`);

  const hasIssues = issues.length > 0;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Review & Confirm</h3>
          <p className="text-xs text-muted-foreground">
            Review your P2A Handover Plan before submitting for approval
          </p>
        </div>
        <Badge 
          variant={hasIssues ? "destructive" : "default"}
          className={cn(!hasIssues && "bg-emerald-500")}
        >
          {hasIssues ? `${issues.length} issues` : 'Ready'}
        </Badge>
      </div>

      {/* Issues Warning */}
      {hasIssues && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <ul className="space-y-0.5 list-disc list-inside">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Box className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium">Systems</span>
          </div>
          <div className="text-xl font-bold">{systems.length}</div>
          <div className="text-xs text-muted-foreground">
            {assignedSystemsCount} mapped to VCRs
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Box className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">VCRs</span>
          </div>
          <div className="text-xl font-bold">{vcrs.length}</div>
          <div className="text-xs text-muted-foreground">
            {assignedVCRsCount} assigned to phases
          </div>
        </div>
      </div>

      {/* VCR Table */}
      {vcrs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            VCRs
          </div>
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1 text-xs items-center">
            {vcrs.map((vcr) => {
              const systemCount = (mappings[vcr.id] || []).length;
              const phase = phases.find(p => p.id === vcrPhaseAssignments[vcr.id]);
              const shortCode = shortVCRCode(vcr.code);
              return (
                <React.Fragment key={vcr.id}>
                  <span className="font-mono text-muted-foreground">{shortCode}</span>
                  <span className="truncate">{vcr.name}</span>
                  <span className="text-muted-foreground">{systemCount} sys</span>
                  {phase ? (
                    <Badge variant="secondary" className="text-[10px]">{phase.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Approvers */}
      {approvers.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Selected Approvers
          </div>
          <div className="space-y-1.5">
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
              return (
                <div key={approver.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-[9px] bg-muted">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {hasUser ? (
                      <>
                        <span className="text-xs font-medium">{approver.user_name}</span>
                        <p className="text-[10px] text-muted-foreground truncate">{approver.role_name}</p>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-muted-foreground">{approver.role_name}</span>
                        <p className="text-[10px] text-amber-600">Not assigned</p>
                      </>
                    )}
                  </div>
                  {!hasUser ? (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : approver.status === 'APPROVED' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : approver.status === 'REJECTED' ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
