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
import { ORAAddTrainingItemDialog } from './ORAAddTrainingItemDialog';
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
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ORATrainingItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const { trainingPlans, isLoading, submitForApproval, updateApproval, updateTrainingItem, addTrainingItem } = useORATrainingPlans(oraPlanId);

  // Aggregate all training items from all plans
  const allTrainingItems = trainingPlans?.flatMap(plan => 
    plan.items?.map(item => ({ ...item, planTitle: plan.title, planId: plan.id })) || []
  ) || [];

  const completedItems = allTrainingItems.filter(i => i.execution_stage === 'COMPLETED').length;
  const totalItems = allTrainingItems.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const totalCost = trainingPlans?.reduce((sum, plan) => sum + (plan.total_estimated_cost || 0), 0) || 0;

  const handleItemClick = (item: ORATrainingItem) => {
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

  // Direct Items View - show all training items without intermediate plan card
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
        {totalItems > 0 ? (
          <Button onClick={() => setShowAddItemDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        ) : (
          <Button onClick={() => setShowWizard(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Training Plan
          </Button>
        )}
      </div>

      {totalItems === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No Training Items Yet</h3>
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
        <>
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
                <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Training Items */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Items ({totalItems})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({totalItems - completedItems})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedItems})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {allTrainingItems.map((item) => {
                    const stageInfo = getExecutionStageInfo(item.execution_stage);
                    return (
                      <Card 
                        key={item.id} 
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => handleItemClick(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                                <h4 className="font-medium truncate">{item.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.overview}</p>
                              
                              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                {item.training_provider && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Building className="w-3 h-3" />
                                    {item.training_provider}
                                  </span>
                                )}
                                {item.duration_hours && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {Math.ceil(item.duration_hours / 8)} {Math.ceil(item.duration_hours / 8) === 1 ? 'day' : 'days'}
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
                            </div>
                            {/* Execution Stage Badge - Right side */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className={`${stageInfo.color} text-white border-none`}>
                                {stageInfo.label}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                  {allTrainingItems.filter(i => i.execution_stage !== 'COMPLETED').map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleItemClick(item)}
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
                  {allTrainingItems.filter(i => i.execution_stage === 'COMPLETED').map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleItemClick(item)}
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
        </>
      )}

      {/* Training Item Details Dialog */}
      {selectedItem && trainingPlans && trainingPlans.length > 0 && (
        <ORATrainingItemDetails
          item={selectedItem}
          open={showItemDetails}
          onOpenChange={setShowItemDetails}
          onUpdateItem={updateTrainingItem}
          planStatus={trainingPlans[0].status}
        />
      )}

      <ORATrainingPlanWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        oraPlanId={oraPlanId}
      />

      <ORAAddTrainingItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        trainingPlans={trainingPlans || []}
        onAddItem={(planId, item) => addTrainingItem({ planId, item })}
      />
    </div>
  );
};
