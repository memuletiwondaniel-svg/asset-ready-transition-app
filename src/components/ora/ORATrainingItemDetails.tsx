import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  GraduationCap, Building, Clock, DollarSign, Calendar, Users,
  FileText, CheckCircle2, AlertCircle, Upload, X, Plus,
  ClipboardCheck, Package, Play
} from 'lucide-react';
import { ORATrainingItem, ORATrainingMaterial } from '@/hooks/useORATrainingPlan';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ORATrainingItemDetailsProps {
  item: ORATrainingItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateItem: (data: { itemId: string; updates: Partial<ORATrainingItem> }) => void;
  planStatus: string;
}

const EXECUTION_STAGES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'bg-slate-500', icon: Clock },
  { value: 'MATERIALS_REQUESTED', label: 'Materials Requested', color: 'bg-blue-500', icon: Package },
  { value: 'MATERIALS_UNDER_REVIEW', label: 'Under TA Review', color: 'bg-amber-500', icon: ClipboardCheck },
  { value: 'MATERIALS_APPROVED', label: 'Materials Approved', color: 'bg-green-500', icon: CheckCircle2 },
  { value: 'PO_ISSUED', label: 'PO Issued', color: 'bg-purple-500', icon: FileText },
  { value: 'TRAINEES_IDENTIFIED', label: 'Trainees Identified', color: 'bg-indigo-500', icon: Users },
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-cyan-500', icon: Calendar },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-500', icon: Play },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle2 }
];

export const ORATrainingItemDetails: React.FC<ORATrainingItemDetailsProps> = ({
  item,
  open,
  onOpenChange,
  onUpdateItem,
  planStatus
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [newTrainee, setNewTrainee] = useState('');
  const [materials, setMaterials] = useState<ORATrainingMaterial[]>(item.materials || []);

  const stageInfo = EXECUTION_STAGES.find(s => s.value === item.execution_stage) || EXECUTION_STAGES[0];
  const currentStageIndex = EXECUTION_STAGES.findIndex(s => s.value === item.execution_stage);

  const handleAddTrainee = () => {
    if (!newTrainee.trim()) return;
    const updatedTrainees = [...(item.trainees || []), newTrainee.trim()];
    onUpdateItem({ itemId: item.id, updates: { trainees: updatedTrainees } });
    setNewTrainee('');
  };

  const handleRemoveTrainee = (trainee: string) => {
    const updatedTrainees = (item.trainees || []).filter(t => t !== trainee);
    onUpdateItem({ itemId: item.id, updates: { trainees: updatedTrainees } });
  };

  const handleAdvanceStage = () => {
    if (currentStageIndex < EXECUTION_STAGES.length - 1) {
      const nextStage = EXECUTION_STAGES[currentStageIndex + 1].value as ORATrainingItem['execution_stage'];
      onUpdateItem({ itemId: item.id, updates: { execution_stage: nextStage } });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const filePath = `training-materials/${item.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('training-materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('ora_training_materials')
        .insert({
          training_item_id: item.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          material_type: 'DOCUMENT',
          uploaded_by: user.user.id
        });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'Material uploaded successfully' });
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{item.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{item.training_provider || 'No provider specified'}</p>
              </div>
            </div>
            <Badge className={`${stageInfo.color} text-white`}>
              {stageInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details" className="gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="attendees" className="gap-2">
              <Users className="w-4 h-4" />
              Attendees ({item.trainees?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <Package className="w-4 h-4" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Status & Approvals
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="details" className="m-0 space-y-4">
              {/* Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{item.overview || 'No overview provided'}</p>
                </CardContent>
              </Card>

              {/* Detailed Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Detailed Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{item.detailed_description || 'No detailed description provided'}</p>
                </CardContent>
              </Card>

              {/* Justification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Justification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{item.justification || 'No justification provided'}</p>
                </CardContent>
              </Card>

              {/* Key Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Training Provider</p>
                        <p className="font-medium">{item.training_provider || 'Not specified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium">{item.duration_hours ? `${item.duration_hours} hours` : 'Not specified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated Cost</p>
                        <p className="font-medium">${item.estimated_cost?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">
                          {item.scheduled_date 
                            ? format(new Date(item.scheduled_date), 'MMM d, yyyy')
                            : item.tentative_date 
                              ? `${format(new Date(item.tentative_date), 'MMM d, yyyy')} (Tentative)`
                              : 'Not scheduled'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Target Audience */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Target Audience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {item.target_audience?.length > 0 ? (
                      item.target_audience.map((audience, idx) => (
                        <Badge key={idx} variant="secondary">{audience}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No target audience specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendees" className="m-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Training Attendees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Trainee */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter trainee name..."
                      value={newTrainee}
                      onChange={(e) => setNewTrainee(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTrainee()}
                    />
                    <Button onClick={handleAddTrainee} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {/* Trainees List */}
                  <div className="space-y-2">
                    {item.trainees?.length > 0 ? (
                      item.trainees.map((trainee, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">{trainee}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTrainee(trainee)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No trainees added yet</p>
                        <p className="text-sm">Add trainees who will attend this training</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="m-0 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Training Materials</CardTitle>
                    <Label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                      />
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          <Upload className="w-4 h-4" />
                          Upload Material
                        </span>
                      </Button>
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  {materials?.length > 0 ? (
                    <div className="space-y-2">
                      {materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{material.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {material.file_size ? `${(material.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {material.is_approved ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Review
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No materials uploaded yet</p>
                      <p className="text-sm">Upload training materials for review</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="m-0 space-y-4">
              {/* Execution Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Execution Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {EXECUTION_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const StageIcon = stage.icon;
                      
                      return (
                        <div 
                          key={stage.value}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            isCurrent ? 'bg-primary/10 border border-primary/30' :
                            isCompleted ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? `${stage.color} text-white` : 'bg-muted'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <StageIcon className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`font-medium ${
                            isCompleted ? 'text-green-700 dark:text-green-300' :
                            isCurrent ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {stage.label}
                          </span>
                          {isCurrent && (
                            <Badge variant="outline" className="ml-auto">Current</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {planStatus === 'APPROVED' && item.execution_stage !== 'COMPLETED' && (
                    <Button 
                      className="w-full mt-4 gap-2" 
                      onClick={handleAdvanceStage}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Advance to Next Stage
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* TA Approval Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">TA Review Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.ta_approval_date ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">Materials Approved</p>
                        <p className="text-sm text-muted-foreground">
                          Approved on {format(new Date(item.ta_approval_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-300">Pending TA Review</p>
                        <p className="text-sm text-muted-foreground">
                          Materials have not been reviewed by Technical Authority yet
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PO Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Purchase Order</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.po_number ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground">PO Number</span>
                        <span className="font-medium">{item.po_number}</span>
                      </div>
                      {item.po_issued_date && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm text-muted-foreground">Issue Date</span>
                          <span className="font-medium">{format(new Date(item.po_issued_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No PO issued yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
