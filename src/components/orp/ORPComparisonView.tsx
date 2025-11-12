import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useORPComparison } from '@/hooks/useORPComparison';
import { useORPPlans } from '@/hooks/useORPPlans';
import { ArrowLeftRight, Calendar, CheckCircle2, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ORPComparisonViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ORPComparisonView: React.FC<ORPComparisonViewProps> = ({
  open,
  onOpenChange
}) => {
  const { plans: allPlans } = useORPPlans();
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const { comparisonData, isLoading } = useORPComparison(selectedPlanIds);

  const handleTogglePlan = (planId: string) => {
    setSelectedPlanIds(prev => {
      if (prev.includes(planId)) {
        return prev.filter(id => id !== planId);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 plans
      }
      return [...prev, planId];
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Compare ORP Plans (Select up to 3)
          </DialogTitle>
        </DialogHeader>

        {selectedPlanIds.length === 0 ? (
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {allPlans?.map((plan: any) => (
                <Card
                  key={plan.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTogglePlan(plan.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{plan.project_name}</CardTitle>
                        <Badge variant="outline" className="mt-2">
                          {plan.phase.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Checkbox
                        checked={selectedPlanIds.includes(plan.id)}
                        onCheckedChange={() => handleTogglePlan(plan.id)}
                        disabled={!selectedPlanIds.includes(plan.id) && selectedPlanIds.length >= 3}
                      />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-2 mb-4">
              {comparisonData?.map((plan: any) => (
                <Badge key={plan.id} variant="secondary" className="gap-2">
                  {plan.project_name}
                  <button
                    onClick={() => handleTogglePlan(plan.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {selectedPlanIds.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlanIds([])}
                >
                  + Add More
                </Button>
              )}
            </div>

            <ScrollArea className="h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 gap-6">
                {/* Overview Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4 text-sm font-medium">Metric</th>
                            {comparisonData?.map((plan: any) => (
                              <th key={plan.id} className="text-left py-2 px-4 text-sm font-medium">
                                {plan.project_name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm">Phase</td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4">
                                <Badge variant="outline">{plan.phase.replace('_', ' ')}</Badge>
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm">Status</td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4">
                                <Badge>{plan.status}</Badge>
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm">ORA Engineer</td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4 text-sm">{plan.ora_engineer}</td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Deliverables
                            </td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4">
                                <div className="text-sm">
                                  {plan.completed_deliverables} / {plan.deliverables_count} completed
                                </div>
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Total Manhours
                            </td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4 text-sm">
                                {plan.total_manhours?.toFixed(1) || 0} hrs
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Resources
                            </td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4 text-sm">
                                {plan.resources_count} assigned
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 text-sm flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Last Updated
                            </td>
                            {comparisonData?.map((plan: any) => (
                              <td key={plan.id} className="py-3 px-4 text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Deliverables Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Deliverables Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {comparisonData?.map((plan: any) => (
                        <div key={plan.id} className="border-l-4 border-primary pl-4">
                          <h4 className="font-medium mb-2">{plan.project_name}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">Not Started</div>
                              <div className="font-medium">
                                {plan.deliverables?.filter((d: any) => d.status === 'NOT_STARTED').length || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">In Progress</div>
                              <div className="font-medium">
                                {plan.deliverables?.filter((d: any) => d.status === 'IN_PROGRESS').length || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Completed</div>
                              <div className="font-medium text-green-600">
                                {plan.deliverables?.filter((d: any) => d.status === 'COMPLETED').length || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">On Hold</div>
                              <div className="font-medium">
                                {plan.deliverables?.filter((d: any) => d.status === 'ON_HOLD').length || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
