import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Clock, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionPlanGateProps {
  executionPlanStatus: string;
  deliverableType: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Gates deliverable tab content behind VCR Plan approval.
 * Shows appropriate messaging when plan is DRAFT or SUBMITTED.
 */
export const ExecutionPlanGate: React.FC<ExecutionPlanGateProps> = ({
  executionPlanStatus,
  deliverableType,
  icon,
  children,
}) => {
  const isApproved = executionPlanStatus === 'APPROVED';

  if (isApproved) {
    return <>{children}</>;
  }

  const isDraft = executionPlanStatus === 'DRAFT';
  const isSubmitted = executionPlanStatus === 'SUBMITTED';

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          isDraft ? "bg-muted" : "bg-amber-500/10"
        )}>
          {isDraft ? (
            <ClipboardList className="w-8 h-8 text-muted-foreground" />
          ) : (
            <Clock className="w-8 h-8 text-amber-500" />
          )}
        </div>

        <Badge
          variant="outline"
          className={cn(
            "mb-3 text-xs",
            isDraft && "border-muted-foreground/30 text-muted-foreground",
            isSubmitted && "border-amber-500 text-amber-600"
          )}
        >
          {isDraft ? 'Plan Not Started' : 'Pending Approval'}
        </Badge>

        <h3 className="font-medium text-lg text-center">
          {isDraft
            ? `${deliverableType} — Pending Execution Plan`
            : `${deliverableType} — Awaiting Approval`}
        </h3>

        <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
          {isDraft
            ? `The VCR Plan must be created and approved before ${deliverableType.toLowerCase()} can be tracked. Define the scope of work in the VCR Plan first.`
            : `The VCR Plan has been submitted for approval. Once approved, the agreed ${deliverableType.toLowerCase()} will appear here for execution tracking.`}
        </p>

        <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
          <FileCheck className="w-4 h-4" />
          <span>PDCA: Plan → Do → Check → Act</span>
        </div>
      </CardContent>
    </Card>
  );
};
