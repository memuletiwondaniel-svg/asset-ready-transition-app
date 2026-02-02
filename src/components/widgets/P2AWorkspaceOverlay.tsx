import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, KeyRound } from 'lucide-react';
import { P2AHandoverWorkspace } from '@/components/p2a-workspace/P2AHandoverWorkspace';

interface P2AWorkspaceOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oraPlanId: string;
  projectName?: string;
  projectNumber?: string;
}

export const P2AWorkspaceOverlay: React.FC<P2AWorkspaceOverlayProps> = ({
  open,
  onOpenChange,
  oraPlanId,
  projectName,
  projectNumber,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-full h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/40 to-orange-500/40 rounded-lg blur-sm" />
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
                <KeyRound className="h-4 w-4 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">P2A Handover Plan</h2>
            {projectNumber && (
              <span className="text-sm text-muted-foreground font-mono">{projectNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
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
