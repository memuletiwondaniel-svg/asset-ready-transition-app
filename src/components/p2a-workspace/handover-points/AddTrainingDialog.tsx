import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  GraduationCap, 
  Search, 
  Layers, 
  Flame, 
  Snowflake,
  Check,
  X,
  Loader2,
  Send
} from 'lucide-react';
import { useHandoverPointSystems } from '../hooks/useP2AHandoverPoints';
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
  vcrName?: string;
}

export const AddTrainingDialog: React.FC<AddTrainingDialogProps> = ({
  open,
  onOpenChange,
  handoverPlanId,
  oraPlanId,
  preselectedSystemIds = [],
  preselectedVCRId,
  vcrName,
}) => {
  const { systems: vcrSystems, isLoading: vcrSystemsLoading } = useHandoverPointSystems(preselectedVCRId || '');
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

  const availableSystems = vcrSystems || [];
  const systemsLoading = vcrSystemsLoading;

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

  const filteredSystems = availableSystems.filter((s: any) =>
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
    
    const planId = trainingPlans?.[0]?.id;
    if (!planId) return;

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

  const selectedSystems = availableSystems.filter((s: any) => selectedSystemIds.includes(s.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-br from-violet-500/5 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <SheetTitle>Add Training Item</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {vcrName ? `For ${vcrName}` : 'Create a training item and map it to systems'}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Training Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Training Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., DCS Operations Training"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overview" className="text-sm font-medium">Overview</Label>
                <Textarea
                  id="overview"
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  placeholder="Brief description of the training..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider" className="text-sm font-medium">Training Provider</Label>
                <Input
                  id="provider"
                  value={trainingProvider}
                  onChange={(e) => setTrainingProvider(e.target.value)}
                  placeholder="e.g., Vendor name or internal"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium">Duration (hrs)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={durationHours || ''}
                    onChange={(e) => setDurationHours(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-sm font-medium">Est. Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={estimatedCost || ''}
                    onChange={(e) => setEstimatedCost(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">Tentative Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={tentativeDate}
                    onChange={(e) => setTentativeDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Target Audience */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Target Audience</Label>
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

            <Separator />

            {/* System Mapping */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">
                    Applicable Systems
                  </Label>
                </div>
                {selectedSystemIds.length > 0 && (
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-500">
                    {selectedSystemIds.length} selected
                  </Badge>
                )}
              </div>

              {/* Selected Systems Preview */}
              {selectedSystems.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-dashed">
                  {selectedSystems.map((system: any) => (
                    <Badge key={system.id} variant="secondary" className="gap-1 pr-1">
                      {system.is_hydrocarbon ? (
                        <Flame className="w-3 h-3 text-orange-500" />
                      ) : (
                        <Snowflake className="w-3 h-3 text-blue-500" />
                      )}
                      <span className="max-w-[120px] truncate">{system.name}</span>
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
                  className="pl-9"
                />
              </div>

              {/* System List */}
              <Card className="border-muted">
                <CardContent className="p-0">
                  <ScrollArea className="h-[180px]">
                    {systemsLoading ? (
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : availableSystems.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No systems mapped to this VCR.
                      </div>
                    ) : filteredSystems.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No systems match your search
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredSystems.map((system: any) => {
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">
                Select systems from this VCR that this training applies to.
              </p>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!title.trim() || isAdding}
              className="flex-1 gap-2 bg-violet-500 hover:bg-violet-600"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  Add Training
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
