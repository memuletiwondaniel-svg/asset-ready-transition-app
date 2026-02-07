import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Box, 
  Key, 
  Users, 
  CheckCircle2,
  AlertCircle,
  FileText,
  Send
} from 'lucide-react';
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

      {/* Project Info */}
      <div className="p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-sm">
              P2A Handover Plan - {projectName || projectCode}
            </div>
            <div className="text-xs text-muted-foreground font-mono">{projectCode}</div>
          </div>
        </div>
      </div>

      {/* Issues Warning */}
      {hasIssues && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Warnings:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
              <p className="mt-2">You can still submit, but consider addressing these first.</p>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="h-[220px]">
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Box className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">Systems</span>
              </div>
              <div className="text-xl font-bold">{systems.length}</div>
              <div className="text-xs text-muted-foreground">
                {assignedSystemsCount} mapped to VCRs
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">VCRs</span>
              </div>
              <div className="text-xl font-bold">{vcrs.length}</div>
              <div className="text-xs text-muted-foreground">
                {assignedVCRsCount} assigned to phases
              </div>
            </div>
          </div>

          {/* VCR List */}
          {vcrs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Verification Certificate of Readiness
              </div>
              <div className="space-y-1">
                {vcrs.map((vcr) => {
                  const mappedKeys = mappings[vcr.id] || [];
                  const systemCount = mappedKeys.length;
                  const phaseId = vcrPhaseAssignments[vcr.id];
                  const phase = phases.find(p => p.id === phaseId);
                  
                  return (
                    <div
                      key={vcr.id}
                      className="flex items-center gap-2 p-2 rounded border bg-card"
                    >
                      <Key className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm flex-1">{vcr.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {vcr.code}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {systemCount} systems
                      </Badge>
                      {phase && (
                        <Badge variant="secondary" className="text-[10px]">
                          {phase.name}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approval Chain */}
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Approval Chain
            </div>
            <div className="flex flex-wrap gap-1">
              {approvers.map((approver, index) => (
                <React.Fragment key={approver.id}>
                  <Badge variant="outline" className="text-xs">
                    {index + 1}. {approver.role_name}
                  </Badge>
                  {index < approvers.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Submit Info */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Send className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-xs">
            <strong>What happens next:</strong>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>• The plan will be saved as "In Review"</li>
              <li>• Approval tasks will be created for {approvers.length} approvers</li>
              <li>• The first approver ({approvers[0]?.role_name}) will be notified</li>
              <li>• VCRs will appear in the widget with "Draft" status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
