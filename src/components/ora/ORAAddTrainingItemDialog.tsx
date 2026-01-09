import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ORATrainingPlan, ORATrainingItemInput } from '@/hooks/useORATrainingPlan';
import { GraduationCap } from 'lucide-react';

interface ORAAddTrainingItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingPlans: ORATrainingPlan[];
  onAddItem: (planId: string, item: ORATrainingItemInput) => void;
}

const TARGET_AUDIENCE_OPTIONS = [
  'Operations',
  'Maintenance', 
  'Management',
  'HSE',
  'Engineering',
  'Contractors'
];

export const ORAAddTrainingItemDialog: React.FC<ORAAddTrainingItemDialogProps> = ({
  open,
  onOpenChange,
  trainingPlans,
  onAddItem,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(trainingPlans[0]?.id || '');
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [trainingProvider, setTrainingProvider] = useState('');
  const [durationHours, setDurationHours] = useState<number | undefined>();
  const [estimatedCost, setEstimatedCost] = useState<number | undefined>();
  const [tentativeDate, setTentativeDate] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedPlanId) return;

    setIsSubmitting(true);
    
    const item: ORATrainingItemInput = {
      title: title.trim(),
      overview: overview.trim() || undefined,
      training_provider: trainingProvider.trim() || undefined,
      duration_hours: durationHours,
      estimated_cost: estimatedCost,
      tentative_date: tentativeDate || undefined,
      target_audience: targetAudience.length > 0 ? targetAudience : undefined,
    };

    onAddItem(selectedPlanId, item);
    
    // Reset form
    setTitle('');
    setOverview('');
    setTrainingProvider('');
    setDurationHours(undefined);
    setEstimatedCost(undefined);
    setTentativeDate('');
    setTargetAudience([]);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleAudienceToggle = (audience: string) => {
    setTargetAudience(prev => 
      prev.includes(audience)
        ? prev.filter(a => a !== audience)
        : [...prev, audience]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Add Training Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Selection - only show if multiple plans */}
          {trainingPlans.length > 1 && (
            <div className="space-y-2">
              <Label>Training Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {trainingPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., DCS Operations Training"
            />
          </div>

          {/* Overview */}
          <div className="space-y-2">
            <Label htmlFor="overview">Overview</Label>
            <Textarea
              id="overview"
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Brief description of the training..."
              rows={2}
            />
          </div>

          {/* Training Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider">Training Provider</Label>
            <Input
              id="provider"
              value={trainingProvider}
              onChange={(e) => setTrainingProvider(e.target.value)}
              placeholder="e.g., Vendor name or internal"
            />
          </div>

          {/* Duration and Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                value={durationHours || ''}
                onChange={(e) => setDurationHours(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                value={estimatedCost || ''}
                onChange={(e) => setEstimatedCost(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 5000"
              />
            </div>
          </div>

          {/* Tentative Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Tentative Date</Label>
            <Input
              id="date"
              type="date"
              value={tentativeDate}
              onChange={(e) => setTentativeDate(e.target.value)}
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <div className="grid grid-cols-3 gap-2">
              {TARGET_AUDIENCE_OPTIONS.map((audience) => (
                <div key={audience} className="flex items-center space-x-2">
                  <Checkbox
                    id={audience}
                    checked={targetAudience.includes(audience)}
                    onCheckedChange={() => handleAudienceToggle(audience)}
                  />
                  <label
                    htmlFor={audience}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {audience}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !selectedPlanId || isSubmitting}
          >
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
