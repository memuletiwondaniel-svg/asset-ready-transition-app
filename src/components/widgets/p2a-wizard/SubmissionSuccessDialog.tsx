import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import type { WizardApprover } from './steps/ApprovalSetupStep';
import type { WizardSystem } from './steps/SystemsImportStep';
import type { WizardVCR } from './steps/VCRCreationStep';
import type { WizardPhase } from './steps/PhasesStep';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const SubmissionSuccessDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  projectCode,
  projectName,
  systems,
  vcrs,
  phases,
  approvers,
  onDone,
  onOpenWorkspace,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { data: profileUsers } = useProfileUsers();

  // Each assigned approver row maps 1:1 to an approval task created by the DB trigger.
  const assignedApprovers = useMemo(
    () => approvers.filter(a => !!a.user_id).sort((a, b) => a.display_order - b.display_order),
    [approvers]
  );

  // Detect B2B partner per approver (same normalized position elsewhere in the org).
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

  const taskCount = assignedApprovers.length;
  const hcCount = systems.filter(s => (s as any).is_hydrocarbon).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Success header */}
        <div className="flex flex-col items-center text-center px-6 pt-6 pb-4">
          <div className="h-11 w-11 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold">Submitted for approval</h2>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {projectCode}{projectName ? ` · ${projectName}` : ''}
          </p>
        </div>

        {/* Receipt block */}
        <div className="mx-6 mb-4 rounded-lg border border-border bg-muted/40">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors rounded-lg"
            aria-expanded={expanded}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium flex-1">
              {taskCount} approval {taskCount === 1 ? 'task' : 'tasks'} created and assigned
            </span>
            <span className="text-[11px] text-muted-foreground mr-1">
              {expanded ? 'Hide' : 'View'} details
            </span>
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </button>

          {expanded && (
            <div className="border-t border-border max-h-56 overflow-y-auto px-3 py-2 space-y-1.5">
              {assignedApprovers.map(a => {
                const partner = approverPartner.get(a.id);
                return (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-medium truncate">{a.user_name}</span>
                    {partner && (
                      <span
                        className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0"
                        title={`Either partner can approve: ${a.user_name} or ${partner.full_name}`}
                      >
                        B2B
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto truncate">
                      {partner ? 'either partner' : a.role_name}
                    </span>
                  </div>
                );
              })}
              {assignedApprovers.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">No approvers assigned.</p>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="px-6 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
          >
            Pending approval
          </Badge>
        </div>

        {/* Summary */}
        <div className="mx-6 mt-3 pt-3 border-t border-border flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground tabular-nums">
          <span>{systems.length} systems</span>
          <span className="opacity-40">·</span>
          <span>{vcrs.length} VCRs</span>
          <span className="opacity-40">·</span>
          <span>{phases.length} phases</span>
          <span className="opacity-40">·</span>
          <span>{hcCount} HC</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 mt-4">
          <Button variant="outline" className="flex-1" onClick={onDone}>
            Done
          </Button>
          {onOpenWorkspace && (
            <Button className="flex-1 gap-1.5" onClick={onOpenWorkspace}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open workspace
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
