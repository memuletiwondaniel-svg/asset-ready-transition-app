import React, { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, Minus, Plus, FolderOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';
import { catalogToWizardActivity, WizardActivity } from '@/components/ora/wizard/types';
import { generateLeafTasks } from '@/utils/generateLeafTasks';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'catalog' | 'custom';
}

export const AddActivityDialog: React.FC<Props> = ({ open, onOpenChange, mode }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Catalog mode state
  const { activities: catalogActivities } = useORAActivityCatalog();
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());

  // Custom mode state
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Fetch approved ORA plans with project info
  const { data: approvedPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['approved-ora-plans-for-tasks'],
    queryFn: async () => {
      const client = supabase as any;
      const { data } = await client
        .from('orp_plans')
        .select('id, status, project_id, projects:project_id(id, project_id_prefix, project_id_number, project_title)')
        .eq('status', 'APPROVED');
      return (data || []).map((p: any) => ({
        planId: p.id,
        projectId: p.project_id,
        projectCode: `${p.projects?.project_id_prefix || ''}-${p.projects?.project_id_number || ''}`,
        projectTitle: p.projects?.project_title || 'Untitled',
      }));
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Get existing activity IDs for the selected plan (to exclude from catalog)
  const { data: existingActivityIds = [] } = useQuery({
    queryKey: ['plan-existing-activities', selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return [];
      const client = supabase as any;
      const { data } = await client
        .from('ora_plan_activities')
        .select('source_ref_id')
        .eq('orp_plan_id', selectedPlanId);
      return (data || []).map((a: any) => a.source_ref_id).filter(Boolean);
    },
    enabled: !!selectedPlanId,
  });

  const availableCatalog = useMemo(() => {
    const available = catalogActivities.filter(a => !existingActivityIds.includes(a.id));
    if (!catalogSearch.trim()) return available;
    const q = catalogSearch.toLowerCase();
    return available.filter(a => a.activity.toLowerCase().includes(q));
  }, [catalogActivities, existingActivityIds, catalogSearch]);

  const toggleCatalogSelect = (id: string) => {
    setSelectedCatalogIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setSelectedPlanId('');
    setCatalogSearch('');
    setSelectedCatalogIds(new Set());
    setCustomName('');
    setCustomDescription('');
    setCustomDuration(null);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const selectedPlan = approvedPlans.find((p: any) => p.planId === selectedPlanId);

  const handleSubmitCatalog = useCallback(async () => {
    if (!selectedPlanId || selectedCatalogIds.size === 0) return;
    setSubmitting(true);
    try {
      const newActivities = catalogActivities
        .filter(a => selectedCatalogIds.has(a.id))
        .map(catalogToWizardActivity);

      const client = supabase as any;
      for (const a of newActivities) {
        await client.from('ora_plan_activities').insert({
          orp_plan_id: selectedPlanId,
          name: a.activity,
          activity_code: a.activityCode,
          description: a.description,
          source_type: 'catalog',
          source_ref_id: a.id,
          status: 'NOT_STARTED',
          duration_days: a.durationDays,
          parent_id: a.parentActivityId,
        });
      }

      // Update wizard_state
      const { data: plan } = await client.from('orp_plans').select('wizard_state').eq('id', selectedPlanId).single();
      if (plan?.wizard_state?.activities) {
        const updated = [...plan.wizard_state.activities, ...newActivities.map(a => ({ ...a, selected: true }))];
        await client.from('orp_plans').update({ wizard_state: { ...plan.wizard_state, activities: updated } }).eq('id', selectedPlanId);
      }

      // Generate user tasks
      await generateLeafTasks(selectedPlanId);

      queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
      queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

      toast({ title: `${newActivities.length} activit${newActivities.length > 1 ? 'ies' : 'y'} added to ${selectedPlan?.projectCode}` });
      handleClose(false);
    } catch (err) {
      console.error('Failed to add catalog activities', err);
      toast({ title: 'Failed to add activities', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [selectedPlanId, selectedCatalogIds, catalogActivities, selectedPlan, queryClient, toast]);

  const handleSubmitCustom = useCallback(async () => {
    if (!selectedPlanId || !customName.trim()) return;
    setSubmitting(true);
    try {
      const client = supabase as any;

      // Auto-generate activity code
      const { data: existingActs } = await client
        .from('ora_plan_activities')
        .select('activity_code')
        .eq('orp_plan_id', selectedPlanId);
      let maxNum = 0;
      let prefix = 'CUSTOM';
      for (const a of existingActs || []) {
        const match = (a.activity_code || '').match(/^([A-Z]+)-(\d+)/);
        if (match) {
          prefix = match[1];
          maxNum = Math.max(maxNum, parseInt(match[2]));
        }
      }
      const newCode = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;

      const { data: inserted } = await client.from('ora_plan_activities').insert({
        orp_plan_id: selectedPlanId,
        name: customName,
        activity_code: newCode,
        description: customDescription || '',
        source_type: 'custom',
        status: 'NOT_STARTED',
        duration_days: customDuration,
        start_date: customStartDate || null,
        end_date: customEndDate || null,
      }).select().single();

      // Update wizard_state
      const { data: plan } = await client.from('orp_plans').select('wizard_state').eq('id', selectedPlanId).single();
      if (plan?.wizard_state?.activities) {
        const newActivity: WizardActivity = {
          id: inserted?.id || `custom-${Date.now()}`,
          activityCode: newCode,
          activity: customName,
          description: customDescription || null,
          phaseId: null,
          parentActivityId: null,
          durationHigh: null,
          durationMed: customDuration,
          durationLow: null,
          selected: true,
          durationDays: customDuration,
          startDate: customStartDate,
          endDate: customEndDate,
          predecessorIds: [],
        };
        const updated = [...plan.wizard_state.activities, newActivity];
        await client.from('orp_plans').update({ wizard_state: { ...plan.wizard_state, activities: updated } }).eq('id', selectedPlanId);
      }

      await generateLeafTasks(selectedPlanId);

      queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
      queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

      toast({ title: `Activity "${customName}" added to ${selectedPlan?.projectCode}` });
      handleClose(false);
    } catch (err) {
      console.error('Failed to add custom activity', err);
      toast({ title: 'Failed to add activity', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [selectedPlanId, customName, customDescription, customDuration, customStartDate, customEndDate, selectedPlan, queryClient, toast]);

  const canSubmitCatalog = selectedPlanId && selectedCatalogIds.size > 0;
  const canSubmitCustom = selectedPlanId && customName.trim();

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[440px] sm:w-[500px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base">
            {mode === 'catalog' ? 'Add from Activity Catalog' : 'Add Custom Activity'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Project Selector */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project / ORA Plan *
            </Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={plansLoading ? 'Loading...' : 'Select a project'} />
              </SelectTrigger>
              <SelectContent>
                {approvedPlans.map((p: any) => (
                  <SelectItem key={p.planId} value={p.planId}>
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{p.projectCode}</span>
                      <span className="text-muted-foreground">— {p.projectTitle}</span>
                    </span>
                  </SelectItem>
                ))}
                {!plansLoading && approvedPlans.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No approved ORA plans found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Catalog Mode */}
          {mode === 'catalog' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog..."
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-1 pr-3">
                  {availableCatalog.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleCatalogSelect(a.id)}
                    >
                      <Checkbox checked={selectedCatalogIds.has(a.id)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{a.activity}</span>
                        <span className="text-xs text-muted-foreground ml-2">{a.activity_code}</span>
                      </div>
                    </div>
                  ))}
                  {availableCatalog.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No activities available</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Custom Mode */}
          {mode === 'custom' && (
            <>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Name *</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mt-1.5"
                  placeholder="Enter activity name"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="mt-1.5 min-h-[120px]"
                  placeholder="Describe the activity scope and objectives..."
                  rows={4}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration (Days)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setCustomDuration(Math.max(1, (customDuration || 1) - 1))}
                    disabled={!customDuration || customDuration <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={customDuration ?? ''}
                    onChange={(e) => setCustomDuration(e.target.value ? parseInt(e.target.value) : null)}
                    className="text-center"
                    placeholder="—"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setCustomDuration((customDuration || 0) + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Date</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End Date</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          {mode === 'catalog' ? (
            <Button onClick={handleSubmitCatalog} disabled={!canSubmitCatalog || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedCatalogIds.size || ''} Activit{selectedCatalogIds.size === 1 ? 'y' : 'ies'}
            </Button>
          ) : (
            <Button onClick={handleSubmitCustom} disabled={!canSubmitCustom || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Activity
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
