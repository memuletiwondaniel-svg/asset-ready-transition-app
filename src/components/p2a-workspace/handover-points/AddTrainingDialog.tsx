import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  GraduationCap, 
  Search, 
  Layers, 
  Flame, 
  Snowflake,
  Check,
  X,
  Loader2,
  Target
} from 'lucide-react';
import { useP2ASystems, P2ASystem } from '../hooks/useP2ASystems';
import { useVCRTraining } from '../hooks/useVCRTraining';
import { useORATrainingPlans } from '@/hooks/useORATrainingPlan';
import { cn } from '@/lib/utils';

const TARGET_AUDIENCE_OPTIONS = [
  'Operations',
  'Maintenance', 
  'Management',
  'HSE',
  'Engineering',
  'Contractors'
];

interface AddTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPlanId: string;
  oraPlanId: string;
  preselectedSystemIds?: string[];
  preselectedVCRId?: string;
}

export const AddTrainingDialog: React.FC<AddTrainingDialogProps> = ({
  open,
  onOpenChange,
  handoverPlanId,
  oraPlanId,
  preselectedSystemIds = [],
  preselectedVCRId,
}) => {
  const { systems, isLoading: systemsLoading } = useP2ASystems(handoverPlanId);
  const { addTrainingWithSystems, isAdding } = useVCRTraining(oraPlanId);
  const { trainingPlans } = useORATrainingPlans(oraPlanId);

  // Form state
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [trainingProvider, setTrainingProvider] = useState('');
  const [durationHours, setDurationHours] = useState<number | undefined>();
  const [estimatedCost, setEstimatedCost] = useState<number | undefined>();
  const [tentativeDate, setTentativeDate] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>(preselectedSystemIds);
  const [systemSearch, setSystemSearch] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setOverview('');
      setTrainingProvider('');
      setDurationHours(undefined);
      setEstimatedCost(undefined);
      setTentativeDate('');
      setTargetAudience([]);
      setSelectedSystemIds(preselectedSystemIds);
      setSystemSearch('');
    }
  }, [open, preselectedSystemIds]);

  const filteredSystems = systems.filter(s =>
    s.name.toLowerCase().includes(systemSearch.toLowerCase()) ||
    s.system_id.toLowerCase().includes(systemSearch.toLowerCase())
  );

  const handleSystemToggle = (systemId: string) => {
    setSelectedSystemIds(prev =>
      prev.includes(systemId)
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };

  const handleAudienceToggle = (audience: string) => {
    setTargetAudience(prev =>
      prev.includes(audience)
        ? prev.filter(a => a !== audience)
        : [...prev, audience]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    // Get or create a training plan
    const planId = trainingPlans?.[0]?.id;
    if (!planId) {
      // TODO: Create a default training plan if none exists
      return;
    }

    addTrainingWithSystems({
      planId,
      item: {
        title: title.trim(),
        overview: overview.trim() || undefined,
        training_provider: trainingProvider.trim() || undefined,
        duration_hours: durationHours,
        estimated_cost: estimatedCost,
        tentative_date: tentativeDate || undefined,
        target_audience: targetAudience.length > 0 ? targetAudience : undefined,
      },
      systemIds: selectedSystemIds,
      handoverPointId: preselectedVCRId,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  const selectedSystems = systems.filter(s => selectedSystemIds.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-violet-500" />
            </div>
            Add Training Item
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Training Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Training Details
              </h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., DCS Operations Training"
                    className="bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overview">Overview</Label>
                  <Textarea
                    id="overview"
                    value={overview}
                    onChange={(e) => setOverview(e.target.value)}
                    placeholder="Brief description of the training..."
                    rows={2}
                    className="bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">Training Provider</Label>
                  <Input
                    id="provider"
                    value={trainingProvider}
                    onChange={(e) => setTrainingProvider(e.target.value)}
                    placeholder="e.g., Vendor name or internal"
                    className="bg-muted/50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationHours || ''}
                      onChange={(e) => setDurationHours(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="8"
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Est. Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      value={estimatedCost || ''}
                      onChange={(e) => setEstimatedCost(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="5000"
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Tentative Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={tentativeDate}
                      onChange={(e) => setTentativeDate(e.target.value)}
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_AUDIENCE_OPTIONS.map((audience) => (
                      <Badge
                        key={audience}
                        variant={targetAudience.includes(audience) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all',
                          targetAudience.includes(audience) 
                            ? 'bg-violet-500 hover:bg-violet-600' 
                            : 'hover:bg-muted'
                        )}
                        onClick={() => handleAudienceToggle(audience)}
                      >
                        {targetAudience.includes(audience) && <Check className="w-3 h-3 mr-1" />}
                        {audience}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* System Mapping Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Map to Systems
                </h3>
                {selectedSystemIds.length > 0 && (
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-500">
                    {selectedSystemIds.length} selected
                  </Badge>
                )}
              </div>

              {/* Selected Systems Preview */}
              {selectedSystems.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-dashed">
                  {selectedSystems.map(system => (
                    <Badge
                      key={system.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {system.is_hydrocarbon ? (
                        <Flame className="w-3 h-3 text-orange-500" />
                      ) : (
                        <Snowflake className="w-3 h-3 text-blue-500" />
                      )}
                      <span className="max-w-[150px] truncate">{system.name}</span>
                      <button
                        onClick={() => handleSystemToggle(system.id)}
                        className="ml-1 p-0.5 rounded hover:bg-muted"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* System Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={systemSearch}
                  onChange={(e) => setSystemSearch(e.target.value)}
                  placeholder="Search systems..."
                  className="pl-9 bg-muted/50"
                />
              </div>

              {/* System List */}
              <Card className="border-muted">
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px]">
                    {systemsLoading ? (
                      <div className="flex items-center justify-center h-full py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredSystems.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No systems found
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredSystems.map((system) => {
                          const isSelected = selectedSystemIds.includes(system.id);
                          return (
                            <div
                              key={system.id}
                              className={cn(
                                'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                                isSelected ? 'bg-violet-500/10' : 'hover:bg-muted/50'
                              )}
                              onClick={() => handleSystemToggle(system.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSystemToggle(system.id)}
                                className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                              />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {system.is_hydrocarbon ? (
                                  <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                                ) : (
                                  <Snowflake className="w-4 h-4 text-blue-500 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium text-sm truncate">{system.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{system.system_id}</div>
                                </div>
                              </div>
                              {system.assigned_vcr_code && (
                                <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                                  <Target className="w-3 h-3" />
                                  {system.assigned_vcr_code.split('-').slice(0, 2).join('-')}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Select the systems this training applies to. The training will be visible in VCRs where these systems are assigned.
              </p>
            </div>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || isAdding}
            className="bg-violet-500 hover:bg-violet-600"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4 mr-2" />
                Add Training
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
