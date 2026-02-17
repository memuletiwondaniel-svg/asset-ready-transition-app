import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Search, Flame, Snowflake, ChevronDown, Plus, Trash2, Eye, ShieldAlert, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InspectionTestPlanStepProps {
  vcrId: string;
  projectCode?: string;
}

const DEFAULT_ACTIVITIES = [
  'Leak Testing',
  'Line Cleaning / Flushing',
  'Loop Testing',
  'Cause & Effect Testing',
  'Factory Acceptance Testing (FAT)',
  'Site Acceptance Testing (SAT)',
  'MCC Tri-party Walkdown',
  'RFO Certificate Sign-off',
  'Performance Testing',
  'Dynamic Commissioning',
];

interface ITPActivity {
  id: string;
  system_id: string;
  activity_name: string;
  inspection_type: 'WITNESS' | 'HOLD' | 'NA';
  notes: string | null;
  display_order: number;
  isNew?: boolean;
}

interface MappedSystem {
  id: string;
  systemId: string;
  name: string;
  systemCode: string;
  isHydrocarbon: boolean;
  completionPct: number;
}

export const InspectionTestPlanStep: React.FC<InspectionTestPlanStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [openSystems, setOpenSystems] = useState<Set<string>>(new Set());
  const [localActivities, setLocalActivities] = useState<Map<string, ITPActivity[]>>(new Map());

  // Fetch mapped systems
  const { data: systems = [], isLoading: loadingSystems } = useQuery({
    queryKey: ['itp-systems', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('id, p2a_systems!inner(id, name, system_id, is_hydrocarbon, completion_percentage)')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        systemId: row.p2a_systems?.id,
        name: row.p2a_systems?.name || 'Unknown',
        systemCode: row.p2a_systems?.system_id || '',
        isHydrocarbon: row.p2a_systems?.is_hydrocarbon || false,
        completionPct: row.p2a_systems?.completion_percentage || 0,
      })) as MappedSystem[];
    },
  });

  // Fetch existing ITP activities
  const { data: savedActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['itp-activities', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_itp_activities')
        .select('*')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data as ITPActivity[];
    },
  });

  // Seed local state from saved activities or defaults
  useEffect(() => {
    if (loadingSystems || loadingActivities) return;
    const map = new Map<string, ITPActivity[]>();
    systems.forEach((sys) => {
      const existing = savedActivities.filter((a: any) => a.system_id === sys.systemId);
      if (existing.length > 0) {
        map.set(sys.systemId, existing);
      } else {
        // Pre-populate defaults
        map.set(
          sys.systemId,
          DEFAULT_ACTIVITIES.map((name, idx) => ({
            id: crypto.randomUUID(),
            system_id: sys.systemId,
            activity_name: name,
            inspection_type: 'NA' as const,
            notes: null,
            display_order: idx,
            isNew: true,
          }))
        );
      }
    });
    setLocalActivities(map);
  }, [systems, savedActivities, loadingSystems, loadingActivities]);

  // Upsert mutation
  const upsertActivity = useMutation({
    mutationFn: async (activity: ITPActivity) => {
      const payload = {
        id: activity.isNew ? undefined : activity.id,
        handover_point_id: vcrId,
        system_id: activity.system_id,
        activity_name: activity.activity_name,
        inspection_type: activity.inspection_type,
        notes: activity.notes,
        display_order: activity.display_order,
      };
      if (activity.isNew) {
        const { error } = await (supabase as any).from('p2a_itp_activities').insert({ ...payload, id: activity.id });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('p2a_itp_activities').update(payload).eq('id', activity.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] }),
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_itp_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] }),
  });

  const handleTypeChange = useCallback((systemId: string, activityId: string, type: string) => {
    setLocalActivities((prev) => {
      const next = new Map(prev);
      const activities = [...(next.get(systemId) || [])];
      const idx = activities.findIndex((a) => a.id === activityId);
      if (idx >= 0) {
        const updated = { ...activities[idx], inspection_type: (type || 'NA') as any };
        activities[idx] = updated;
        next.set(systemId, activities);
        upsertActivity.mutate({ ...updated, isNew: activities[idx].isNew });
      }
      return next;
    });
  }, [upsertActivity]);

  const handleAddActivity = useCallback((systemId: string) => {
    setLocalActivities((prev) => {
      const next = new Map(prev);
      const activities = [...(next.get(systemId) || [])];
      const newAct: ITPActivity = {
        id: crypto.randomUUID(),
        system_id: systemId,
        activity_name: '',
        inspection_type: 'NA',
        notes: null,
        display_order: activities.length,
        isNew: true,
      };
      activities.push(newAct);
      next.set(systemId, activities);
      return next;
    });
  }, []);

  const handleRemoveActivity = useCallback((systemId: string, activityId: string, isNew?: boolean) => {
    setLocalActivities((prev) => {
      const next = new Map(prev);
      next.set(systemId, (next.get(systemId) || []).filter((a) => a.id !== activityId));
      return next;
    });
    if (!isNew) deleteActivity.mutate(activityId);
  }, [deleteActivity]);

  const handleNameChange = useCallback((systemId: string, activityId: string, name: string) => {
    setLocalActivities((prev) => {
      const next = new Map(prev);
      const activities = [...(next.get(systemId) || [])];
      const idx = activities.findIndex((a) => a.id === activityId);
      if (idx >= 0) activities[idx] = { ...activities[idx], activity_name: name };
      next.set(systemId, activities);
      return next;
    });
  }, []);

  const handleNameBlur = useCallback((systemId: string, activityId: string) => {
    const activities = localActivities.get(systemId) || [];
    const act = activities.find((a) => a.id === activityId);
    if (act && act.activity_name.trim()) {
      upsertActivity.mutate(act);
    }
  }, [localActivities, upsertActivity]);

  const toggleSystem = (id: string) => {
    setOpenSystems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Stats
  const allActivities = Array.from(localActivities.values()).flat();
  const witnessCount = allActivities.filter((a) => a.inspection_type === 'WITNESS').length;
  const holdCount = allActivities.filter((a) => a.inspection_type === 'HOLD').length;

  const filtered = systems.filter(
    (s) =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.systemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingSystems || loadingActivities) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  if (systems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
            <ShieldAlert className="w-7 h-7 text-orange-500" />
          </div>
          <h3 className="font-medium">No Systems Mapped</h3>
          <p className="text-xs text-muted-foreground mt-1">Map systems from the VCR workspace first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search systems..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Badge variant="outline" className="text-[10px]">{systems.length} systems</Badge>
        {witnessCount > 0 && (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-300 gap-1 text-[10px]">
            <Eye className="w-3 h-3" />{witnessCount}W
          </Badge>
        )}
        {holdCount > 0 && (
          <Badge className="bg-red-500/15 text-red-600 border-red-300 gap-1 text-[10px]">
            <ShieldAlert className="w-3 h-3" />{holdCount}H
          </Badge>
        )}
      </div>

      {/* System cards */}
      <ScrollArea className="h-[calc(min(90vh,780px)-300px)]">
        <div className="space-y-2 pr-4">
          {filtered.map((system) => {
            const activities = localActivities.get(system.systemId) || [];
            const sysW = activities.filter((a) => a.inspection_type === 'WITNESS').length;
            const sysH = activities.filter((a) => a.inspection_type === 'HOLD').length;
            const isOpen = openSystems.has(system.systemId);

            return (
              <Collapsible key={system.systemId} open={isOpen} onOpenChange={() => toggleSystem(system.systemId)}>
                <Card className={cn('transition-colors', isOpen && 'border-primary/30')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-t-lg">
                      {system.isHydrocarbon ? (
                        <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                      ) : (
                        <Snowflake className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{system.name}</span>
                          {system.systemCode && (
                            <Badge variant="outline" className="text-[10px] font-mono">{system.systemCode}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sysW > 0 && <Badge className="bg-amber-500/15 text-amber-600 border-amber-300 text-[10px] px-1.5">{sysW}W</Badge>}
                        {sysH > 0 && <Badge className="bg-red-500/15 text-red-600 border-red-300 text-[10px] px-1.5">{sysH}H</Badge>}
                        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/60 px-3 pb-3 pt-2 space-y-1.5">
                      {/* Column headers */}
                      <div className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                        <span className="flex-1">Activity</span>
                        <span className="w-[120px] text-center">Type</span>
                        <span className="w-7" />
                      </div>

                      {activities.map((activity) => (
                        <div key={activity.id} className="group flex items-center gap-2 rounded-md hover:bg-muted/40 px-1 py-1 transition-colors">
                          <Input
                            value={activity.activity_name}
                            onChange={(e) => handleNameChange(system.systemId, activity.id, e.target.value)}
                            onBlur={() => handleNameBlur(system.systemId, activity.id)}
                            placeholder="Activity name..."
                            className="flex-1 h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-1 px-2"
                          />
                          <ToggleGroup
                            type="single"
                            value={activity.inspection_type === 'NA' ? '' : activity.inspection_type}
                            onValueChange={(val) => handleTypeChange(system.systemId, activity.id, val)}
                            className="w-[120px] shrink-0"
                          >
                            <ToggleGroupItem
                              value="WITNESS"
                              className={cn(
                                'h-6 px-2.5 text-[10px] font-semibold rounded-md data-[state=on]:bg-amber-500/15 data-[state=on]:text-amber-600 data-[state=on]:border-amber-400',
                              )}
                            >
                              W
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="HOLD"
                              className={cn(
                                'h-6 px-2.5 text-[10px] font-semibold rounded-md data-[state=on]:bg-red-500/15 data-[state=on]:text-red-600 data-[state=on]:border-red-400',
                              )}
                            >
                              H
                            </ToggleGroupItem>
                          </ToggleGroup>
                          <button
                            onClick={() => handleRemoveActivity(system.systemId, activity.id, activity.isNew)}
                            className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddActivity(system.systemId)}
                        className="h-7 text-xs text-muted-foreground gap-1 mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Activity
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
