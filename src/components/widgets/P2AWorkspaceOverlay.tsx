import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Key, Maximize2 } from 'lucide-react';
import { P2AHandoverWorkspace } from '@/components/p2a-workspace/P2AHandoverWorkspace';
import { useP2AHandoverPlan } from '@/components/p2a-workspace/hooks/useP2AHandoverPlan';
import { cn } from '@/lib/utils';

interface P2AWorkspaceOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oraPlanId: string;
  projectName?: string;
  projectNumber?: string;
}

const getStatusConfig = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return {
        label: 'Draft',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      };
    case 'ACTIVE':
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
      return {
        label: 'In Review',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      };
    case 'COMPLETED':
    case 'APPROVED':
      return {
        label: 'Approved',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      };
    case 'ARCHIVED':
      return {
        label: 'Archived',
        className: 'bg-muted text-muted-foreground border-border',
      };
    default:
      return {
        label: 'Draft',
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      };
  }
};

export const P2AWorkspaceOverlay: React.FC<P2AWorkspaceOverlayProps> = ({
  open,
  onOpenChange,
  oraPlanId,
  projectName,
  projectNumber,
}) => {
  const { plan } = useP2AHandoverPlan(oraPlanId);
  const statusConfig = getStatusConfig(plan?.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-full h-[95vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-lg blur-sm" />
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-4 w-4 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">P2A Handover Plan</h2>
            {projectNumber && (
              <span className="text-sm text-muted-foreground font-mono">{projectNumber}</span>
            )}
            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Expand"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden h-[calc(95vh-57px)]">
          <P2AHandoverWorkspace
            oraPlanId={oraPlanId}
            projectName={projectName}
            projectNumber={projectNumber}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
