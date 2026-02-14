import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Box, 
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';
import { WizardPhase } from './PhasesStep';
import { WizardApprover } from './ApprovalSetupStep';

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
              const shortCode = vcr.code?.replace(/^VCR-[A-Z0-9]+-/, 'VCR-') || vcr.code;
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

      {/* Approvers */}
      {approvers.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Approvers
          </div>
          <div className="flex items-center gap-[-4px]">
            {approvers.map((approver) => {
              const avatarUrl = approver.user_avatar
                ? (approver.user_avatar.startsWith('http')
                    ? approver.user_avatar
                    : supabase.storage.from('user-avatars').getPublicUrl(approver.user_avatar).data.publicUrl)
                : undefined;
              const initials = approver.user_name
                ? approver.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : '?';
              return (
                <Avatar key={approver.id} className="h-7 w-7 border-2 border-background -ml-1 first:ml-0" title={`${approver.user_name || 'Unassigned'} — ${approver.role_name}`}>
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-[9px] bg-muted">{initials}</AvatarFallback>
                </Avatar>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
