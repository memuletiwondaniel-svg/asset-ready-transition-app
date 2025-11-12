import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useORMPlans } from '@/hooks/useORMPlans';
import { useORMDeliverables } from '@/hooks/useORMDeliverables';
import { Wrench, User, Calendar, ArrowRight } from 'lucide-react';

export const ORMKanbanBoard: React.FC = () => {
  const { plans, isLoading } = useORMPlans();
  const { updateDeliverable } = useORMDeliverables();

  const getDeliverableLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET_REGISTER: 'Asset Register',
      PREVENTIVE_MAINTENANCE: 'PM Routine',
      BOM_DEVELOPMENT: 'BOM',
      OPERATING_SPARES: 'Op Spares',
      IMS_UPDATE: 'IMS',
      PM_ACTIVATION: 'PM Activation'
    };
    return labels[type] || type;
  };

  const stages = [
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
    { id: 'QAQC_REVIEW', label: 'QA/QC Review', color: 'bg-yellow-500' },
    { id: 'LEAD_REVIEW', label: 'Lead Review', color: 'bg-orange-500' },
    { id: 'CENTRAL_TEAM_REVIEW', label: 'Central Team', color: 'bg-purple-500' },
    { id: 'APPROVED', label: 'Approved', color: 'bg-green-500' }
  ];

  const getDeliverablesInStage = (stage: string) => {
    const deliverables: any[] = [];
    plans?.forEach(plan => {
      plan.deliverables?.forEach((del: any) => {
        if (del.workflow_stage === stage) {
          deliverables.push({
            ...del,
            project: plan.project,
            plan_id: plan.id
          });
        }
      });
    });
    return deliverables;
  };

  return (
    <div className="h-full p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 h-full">
        {stages.map((stage) => {
          const items = getDeliverablesInStage(stage.id);

          return (
            <Card key={stage.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{stage.label}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden pt-0">
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-4">
                    {items.map((item) => (
                      <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-xs mb-1">
                                {item.project?.project_title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {getDeliverableLabel(item.deliverable_type)}
                              </p>
                            </div>
                          </div>

                          {item.assigned_resource && (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={item.assigned_resource.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {item.assigned_resource.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">
                                {item.assigned_resource.full_name}
                              </span>
                            </div>
                          )}

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{item.progress_percentage || 0}%</span>
                            </div>
                            <Progress value={item.progress_percentage || 0} className="h-1.5" />
                          </div>
                        </div>
                      </Card>
                    ))}

                    {items.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        No items
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
