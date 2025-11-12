import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { ORMWorkflowCommentsPanel } from './ORMWorkflowCommentsPanel';
import { useORMDeliverables } from '@/hooks/useORMDeliverables';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ORMWorkflowPanelProps {
  planId: string;
  deliverables: any[];
}

export const ORMWorkflowPanel: React.FC<ORMWorkflowPanelProps> = ({
  planId,
  deliverables
}) => {
  const [expandedDeliverable, setExpandedDeliverable] = useState<string | null>(null);
  const { submitForReview } = useORMDeliverables();
  const getDeliverableLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET_REGISTER: 'Asset Register Build',
      PREVENTIVE_MAINTENANCE: 'PM Routine Build',
      BOM_DEVELOPMENT: 'BOM Development',
      OPERATING_SPARES: '2-Year Operating Spares',
      IMS_UPDATE: 'IMS Update',
      PM_ACTIVATION: 'PM Activation'
    };
    return labels[type] || type;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'In Progress',
      QAQC_REVIEW: 'QA/QC Review',
      LEAD_REVIEW: 'Lead Review',
      CENTRAL_TEAM_REVIEW: 'Central Team Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return labels[stage] || stage;
  };

  const workflowStages = [
    'IN_PROGRESS',
    'QAQC_REVIEW',
    'LEAD_REVIEW',
    'CENTRAL_TEAM_REVIEW',
    'APPROVED'
  ];

  return (
    <div className="space-y-6">
      {deliverables.map((deliverable: any) => (
        <Card key={deliverable.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {getDeliverableLabel(deliverable.deliverable_type)}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {deliverable.assigned_resource && (
                    <>
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={deliverable.assigned_resource.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {deliverable.assigned_resource.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{deliverable.assigned_resource.full_name}</span>
                    </>
                  )}
                </CardDescription>
              </div>
              <Badge>{getStageLabel(deliverable.workflow_stage)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{deliverable.progress_percentage || 0}%</span>
                </div>
                <Progress value={deliverable.progress_percentage || 0} />
              </div>

              {/* Workflow Timeline */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {workflowStages.map((stage, index) => {
                  const isCompleted = workflowStages.indexOf(deliverable.workflow_stage) > index;
                  const isCurrent = deliverable.workflow_stage === stage;

                  return (
                    <React.Fragment key={stage}>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${
                          isCompleted
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isCurrent ? (
                          <Clock className="w-3 h-3" />
                        ) : null}
                        <span>{getStageLabel(stage)}</span>
                      </div>
                      {index < workflowStages.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <Collapsible
                open={expandedDeliverable === deliverable.id}
                onOpenChange={(open) => setExpandedDeliverable(open ? deliverable.id : null)}
              >
                {deliverable.workflow_stage !== 'APPROVED' && (
                  <div className="flex gap-2">
                    <CollapsibleTrigger asChild>
                      <Button size="sm" variant="outline">
                        {expandedDeliverable === deliverable.id ? 'Hide' : 'Show'} Comments
                      </Button>
                    </CollapsibleTrigger>
                    {deliverable.progress_percentage === 100 && deliverable.workflow_stage === 'IN_PROGRESS' && (
                      <Button 
                        size="sm"
                        onClick={() => submitForReview({
                          deliverableId: deliverable.id,
                          deliverable_type: deliverable.deliverable_type,
                          project_name: 'Project' // This should be passed from parent
                        })}
                      >
                        Submit for Review
                      </Button>
                    )}
                  </div>
                )}
                
                <CollapsibleContent className="mt-4">
                  <ORMWorkflowCommentsPanel
                    deliverableId={deliverable.id}
                    workflowStage={deliverable.workflow_stage}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      ))}

      {deliverables.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No deliverables found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
