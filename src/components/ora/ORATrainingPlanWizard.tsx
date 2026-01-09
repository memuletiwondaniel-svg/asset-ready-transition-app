import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GraduationCap, Calendar, DollarSign, Users, Building } from 'lucide-react';
import { useORATrainingPlans, ORATrainingItemInput } from '@/hooks/useORATrainingPlan';

interface ORATrainingPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oraPlanId: string;
  onSuccess?: () => void;
}

const TARGET_AUDIENCES = [
  { value: 'OPS', label: 'Operations' },
  { value: 'MTCE_ELECT', label: 'Maintenance - Electrical' },
  { value: 'MTCE_MECH', label: 'Maintenance - Mechanical' },
  { value: 'MTCE_INST', label: 'Maintenance - Instrumentation' },
  { value: 'HSE', label: 'HSE Team' },
  { value: 'PROCESS_ENG', label: 'Process Engineering' },
  { value: 'CONTROL_ROOM', label: 'Control Room Operators' },
  { value: 'SUPERVISORS', label: 'Supervisors' },
  { value: 'MANAGEMENT', label: 'Management' }
];

export const ORATrainingPlanWizard: React.FC<ORATrainingPlanWizardProps> = ({
  open,
  onOpenChange,
  oraPlanId,
  onSuccess
}) => {
  const [step, setStep] = useState(1);
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [trainingItems, setTrainingItems] = useState<ORATrainingItemInput[]>([]);
  const [currentItem, setCurrentItem] = useState<ORATrainingItemInput>({
    title: '',
    overview: '',
    detailed_description: '',
    justification: '',
    target_audience: [],
    training_provider: '',
    duration_hours: undefined,
    tentative_date: '',
    estimated_cost: undefined
  });

  const { createTrainingPlan, isCreating } = useORATrainingPlans(oraPlanId);

  const handleAddItem = () => {
    if (!currentItem.title) return;
    setTrainingItems([...trainingItems, currentItem]);
    setCurrentItem({
      title: '',
      overview: '',
      detailed_description: '',
      justification: '',
      target_audience: [],
      training_provider: '',
      duration_hours: undefined,
      tentative_date: '',
      estimated_cost: undefined
    });
  };

  const handleRemoveItem = (index: number) => {
    setTrainingItems(trainingItems.filter((_, i) => i !== index));
  };

  const handleToggleAudience = (audience: string) => {
    setCurrentItem(prev => ({
      ...prev,
      target_audience: prev.target_audience.includes(audience)
        ? prev.target_audience.filter(a => a !== audience)
        : [...prev.target_audience, audience]
    }));
  };

  const handleSubmit = () => {
    if (!planTitle || trainingItems.length === 0) return;

    createTrainingPlan({
      ora_plan_id: oraPlanId,
      title: planTitle,
      description: planDescription,
      items: trainingItems
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      }
    });
  };

  const resetForm = () => {
    setStep(1);
    setPlanTitle('');
    setPlanDescription('');
    setTrainingItems([]);
    setCurrentItem({
      title: '',
      overview: '',
      detailed_description: '',
      justification: '',
      target_audience: [],
      training_provider: '',
      duration_hours: undefined,
      tentative_date: '',
      estimated_cost: undefined
    });
  };

  const totalEstimatedCost = trainingItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Create Training Plan - Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step 1: Plan Details */}
          {step === 1 && (
            <div className="space-y-4 p-1">
              <div>
                <Label>Training Plan Title *</Label>
                <Input
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g., Project X Pre-Commissioning Training Plan"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Provide an overview of the training plan..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 2: Add Training Items */}
          {step === 2 && (
            <div className="space-y-4 p-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Training Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Training Title *</Label>
                      <Input
                        value={currentItem.title}
                        onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                        placeholder="e.g., DCS Operations Training"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Training Provider</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <Input
                          value={currentItem.training_provider || ''}
                          onChange={(e) => setCurrentItem({ ...currentItem, training_provider: e.target.value })}
                          placeholder="e.g., Siemens, Schlumberger"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Overview</Label>
                    <Textarea
                      value={currentItem.overview || ''}
                      onChange={(e) => setCurrentItem({ ...currentItem, overview: e.target.value })}
                      placeholder="Brief overview of the training..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Detailed Description</Label>
                    <Textarea
                      value={currentItem.detailed_description || ''}
                      onChange={(e) => setCurrentItem({ ...currentItem, detailed_description: e.target.value })}
                      placeholder="Detailed description of training content, objectives, and outcomes..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Justification / Reason</Label>
                    <Textarea
                      value={currentItem.justification || ''}
                      onChange={(e) => setCurrentItem({ ...currentItem, justification: e.target.value })}
                      placeholder="Why is this training necessary?"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Target Audience
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {TARGET_AUDIENCES.map(audience => (
                        <Badge
                          key={audience.value}
                          variant={currentItem.target_audience.includes(audience.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleToggleAudience(audience.value)}
                        >
                          {audience.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Duration (hours)
                      </Label>
                      <Input
                        type="number"
                        value={currentItem.duration_hours || ''}
                        onChange={(e) => setCurrentItem({ ...currentItem, duration_hours: parseInt(e.target.value) || undefined })}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Tentative Date</Label>
                      <Input
                        type="date"
                        value={currentItem.tentative_date || ''}
                        onChange={(e) => setCurrentItem({ ...currentItem, tentative_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Estimated Cost (USD)
                      </Label>
                      <Input
                        type="number"
                        value={currentItem.estimated_cost || ''}
                        onChange={(e) => setCurrentItem({ ...currentItem, estimated_cost: parseFloat(e.target.value) || undefined })}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button onClick={handleAddItem} disabled={!currentItem.title} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Add to Training Plan
                  </Button>
                </CardContent>
              </Card>

              {/* Added Items List */}
              {trainingItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Training Items ({trainingItems.length})</Label>
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-4">
                      {trainingItems.map((item, index) => (
                        <div key={index} className="flex items-start justify-between p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.training_provider && `Provider: ${item.training_provider} • `}
                              {item.duration_hours && `${item.duration_hours}h • `}
                              {item.estimated_cost && `$${item.estimated_cost.toLocaleString()}`}
                            </div>
                            {item.target_audience.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.target_audience.map(a => (
                                  <Badge key={a} variant="secondary" className="text-xs">
                                    {TARGET_AUDIENCES.find(ta => ta.value === a)?.label}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4 p-1">
              <Card>
                <CardHeader>
                  <CardTitle>Training Plan Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Plan Title</Label>
                    <p className="font-medium">{planTitle}</p>
                  </div>
                  {planDescription && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="text-sm">{planDescription}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <Label className="text-muted-foreground">Total Training Items</Label>
                      <p className="text-2xl font-bold">{trainingItems.length}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Estimated Cost</Label>
                      <p className="text-2xl font-bold text-primary">${totalEstimatedCost.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Approval Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Once submitted, this plan will require approval from:
                  </p>
                  <div className="space-y-2">
                    {['Project Hub Lead', 'Deputy Plant Director', 'Plant Director', 'ORA Lead'].map((role, idx) => (
                      <div key={role} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </div>
                        <span className="text-sm">{role}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {trainingItems.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.overview}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {item.training_provider && <span>Provider: {item.training_provider}</span>}
                        {item.duration_hours && <span>{item.duration_hours} hours</span>}
                        {item.estimated_cost && <span>${item.estimated_cost.toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !planTitle : trainingItems.length === 0}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Training Plan'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
