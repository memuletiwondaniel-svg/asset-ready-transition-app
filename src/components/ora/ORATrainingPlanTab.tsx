import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, GraduationCap, Send, CheckCircle2, Clock, AlertCircle, 
  DollarSign, Users, Building, Calendar, FileText, ChevronRight,
  Play, Package, ClipboardCheck
} from 'lucide-react';
import { useORATrainingPlans, ORATrainingPlan, ORATrainingItem } from '@/hooks/useORATrainingPlan';
import { ORATrainingPlanWizard } from './ORATrainingPlanWizard';
import { ORATrainingItemDetails } from './ORATrainingItemDetails';
import { format } from 'date-fns';

interface ORATrainingPlanTabProps {
  oraPlanId: string;
}

const EXECUTION_STAGES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-slate-500' },
  { value: 'MATERIALS_REQUESTED', label: 'Materials Requested', color: 'bg-blue-500' },
  { value: 'MATERIALS_UNDER_REVIEW', label: 'Under TA Review', color: 'bg-amber-500' },
  { value: 'MATERIALS_APPROVED', label: 'Materials Approved', color: 'bg-green-500' },
  { value: 'PO_ISSUED', label: 'PO Issued', color: 'bg-purple-500' },
  { value: 'TRAINEES_IDENTIFIED', label: 'Trainees Identified', color: 'bg-indigo-500' },
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-cyan-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-500' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' }
];

export const ORATrainingPlanTab: React.FC<ORATrainingPlanTabProps> = ({ oraPlanId }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ORATrainingPlan | null>(null);
  const [selectedItem, setSelectedItem] = useState<ORATrainingItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'details'>('list');
  
  const { trainingPlans, isLoading, submitForApproval, updateApproval, updateTrainingItem } = useORATrainingPlans(oraPlanId);

  const handleItemClick = (item: ORATrainingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setShowItemDetails(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge className="bg-amber-500"><AlertCircle className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'IN_EXECUTION':
        return <Badge className="bg-blue-500"><Play className="w-3 h-3 mr-1" />In Execution</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExecutionStageInfo = (stage: string) => {
    return EXECUTION_STAGES.find(s => s.value === stage) || EXECUTION_STAGES[0];
  };

  const handleAdvanceStage = (item: ORATrainingItem) => {
    const currentIndex = EXECUTION_STAGES.findIndex(s => s.value === item.execution_stage);
    if (currentIndex < EXECUTION_STAGES.length - 1) {
      const nextStage = EXECUTION_STAGES[currentIndex + 1].value as ORATrainingItem['execution_stage'];
      updateTrainingItem({
        itemId: item.id, 
        updates: { execution_stage: nextStage } 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Training Plan Details View
  if (activeView === 'details' && selectedPlan) {
    const completedItems = selectedPlan.items?.filter(i => i.execution_stage === 'COMPLETED').length || 0;
    const totalItems = selectedPlan.items?.length || 0;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveView('list')}>
              ← Back to Plans
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selectedPlan.title}</h2>
              <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(selectedPlan.status)}
            {selectedPlan.status === 'DRAFT' && (
              <Button size="sm" className="gap-2" onClick={() => submitForApproval(selectedPlan.id)}>
                <Send className="w-4 h-4" />
                Submit for Approval
              </Button>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold text-green-600">{completedItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="mt-2">
                <Progress value={progress} className="h-2" />
                <span className="text-sm font-medium">{Math.round(progress)}%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-2xl font-bold">${selectedPlan.total_estimated_cost?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Status */}
        {selectedPlan.status === 'PENDING_APPROVAL' && selectedPlan.approvals && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {selectedPlan.approvals.map((approval, idx) => (
                  <div key={approval.id} className="flex items-center">
                    <div className={`flex flex-col items-center ${
                      approval.status === 'APPROVED' ? 'text-green-600' : 
                      approval.status === 'REJECTED' ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        approval.status === 'APPROVED' ? 'bg-green-100 border-green-500' :
                        approval.status === 'REJECTED' ? 'bg-red-100 border-red-500' :
                        'bg-muted border-muted-foreground/30'
                      }`}>
                        {approval.status === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span className="text-xs mt-1 text-center max-w-20">{approval.approver_role.replace(/_/g, ' ')}</span>
                    </div>
                    {idx < selectedPlan.approvals!.length - 1 && (
                      <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Training Items */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Items ({totalItems})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({totalItems - completedItems})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedItems})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {selectedPlan.items?.map((item) => {
                  const stageInfo = getExecutionStageInfo(item.execution_stage);
                  return (
                    <Card 
                      key={item.id} 
                      className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={(e) => handleItemClick(item, e)}
                    >
                      <div className={`h-1 ${stageInfo.color}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-primary" />
                              <h4 className="font-medium">{item.title}</h4>
                              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{item.overview}</p>
                            
                            <div className="flex flex-wrap gap-4 mt-3 text-sm">
                              {item.training_provider && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Building className="w-3 h-3" />
                                  {item.training_provider}
                                </span>
                              )}
                              {item.duration_hours && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {item.duration_hours}h
                                </span>
                              )}
                              {item.estimated_cost && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <DollarSign className="w-3 h-3" />
                                  ${item.estimated_cost.toLocaleString()}
                                </span>
                              )}
                              {item.tentative_date && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(item.tentative_date), 'MMM d, yyyy')}
                                </span>
                              )}
                              {item.trainees?.length > 0 && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  {item.trainees.length} trainees
                                </span>
                              )}
                            </div>

                            {/* Execution Stage Badge */}
                            <div className="mt-3 pt-3 border-t">
                              <Badge variant="outline" className={`${stageInfo.color} text-white border-none`}>
                                {stageInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="pending" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {selectedPlan.items?.filter(i => i.execution_stage !== 'COMPLETED').map((item) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={(e) => handleItemClick(item, e)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{item.title}</div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {getExecutionStageInfo(item.execution_stage).label}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {selectedPlan.items?.filter(i => i.execution_stage === 'COMPLETED').map((item) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={(e) => handleItemClick(item, e)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {item.completion_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Completed on {format(new Date(item.completion_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Training Item Details Dialog */}
        {selectedItem && (
          <ORATrainingItemDetails
            item={selectedItem}
            open={showItemDetails}
            onOpenChange={setShowItemDetails}
            onUpdateItem={updateTrainingItem}
            planStatus={selectedPlan.status}
          />
        )}
      </div>
    );
  }

  // Training Plans List View
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Training Plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage training requirements for operations readiness
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Training Plan
        </Button>
      </div>

      {trainingPlans?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No Training Plans Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
              Create a training plan to track required trainings, approvals, and execution progress.
            </p>
            <Button onClick={() => setShowWizard(true)} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Training Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {trainingPlans?.map((plan) => {
            const completedItems = plan.items?.filter(i => i.execution_stage === 'COMPLETED').length || 0;
            const totalItems = plan.items?.length || 0;
            const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            return (
              <Card 
                key={plan.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedPlan(plan); setActiveView('details'); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{plan.title}</h3>
                        {getStatusBadge(plan.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      
                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{totalItems} items</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">${plan.total_estimated_cost?.toLocaleString()}</span>
                        </div>
                        <div className="flex-1 max-w-32">
                          <Progress value={progress} className="h-2" />
                        </div>
                        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ORATrainingPlanWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        oraPlanId={oraPlanId}
      />
    </div>
  );
};
