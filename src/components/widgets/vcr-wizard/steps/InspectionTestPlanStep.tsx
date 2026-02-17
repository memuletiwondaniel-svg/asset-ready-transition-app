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
import { Search, ChevronDown, Plus, Minus, Eye, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  systemId: string;
  name: string;
  systemCode: string;
  isHydrocarbon: boolean;
}

export const InspectionTestPlanStep: React.FC<InspectionTestPlanStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [openSystems, setOpenSystems] = useState<Set<string>>(new Set());
  const [localActivities, setLocalActivities] = useState<Map<string, ITPActivity[]>>(new Map());

  // Fetch mapped systems — two-step query to avoid FK ambiguity, deduplicated to system level
  const { data: systems = [], isLoading: loadingSystems } = useQuery({
    queryKey: ['itp-systems', vcrId],
    queryFn: async () => {
      // Step 1: Get unique system IDs from mapping table
      const { data: mappings, error: mapErr } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', vcrId);
      if (mapErr) throw mapErr;
      const uniqueIds = [...new Set((mappings || []).map((r: any) => r.system_id))] as string[];
      if (uniqueIds.length === 0) return [];

      // Step 2: Fetch system details
      const { data: sysData, error: sysErr } = await (supabase as any)
        .from('p2a_systems')
        .select('id, name, system_id, is_hydrocarbon')
        .in('id', uniqueIds)
        .order('name');
      if (sysErr) throw sysErr;
      return (sysData || []).map((s: any) => ({
        systemId: s.id,
        name: s.name || 'Unknown',
        systemCode: s.system_id || '',
        isHydrocarbon: s.is_hydrocarbon || false,
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

  // Seed local state
  useEffect(() => {
    if (loadingSystems || loadingActivities) return;
    const map = new Map<string, ITPActivity[]>();
    systems.forEach((sys) => {
      const existing = savedActivities.filter((a: any) => a.system_id === sys.systemId);
      if (existing.length > 0) {
        map.set(sys.systemId, existing);
      } else {
        map.set(sys.systemId, DEFAULT_ACTIVITIES.map((name, idx) => ({
          id: crypto.randomUUID(),
          system_id: sys.systemId,
          activity_name: name,
          inspection_type: 'NA' as const,
          notes: null,
          display_order: idx,
          isNew: true,
        })));
      }
    });
    setLocalActivities(map);
  }, [systems, savedActivities, loadingSystems, loadingActivities]);

  // Mutations
  const upsertActivity = useMutation({
    mutationFn: async (activity: ITPActivity) => {
      const payload = {
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

  const cycleType = useCallback((systemId: string, activityId: string) => {
    setLocalActivities((prev) => {
      const next = new Map(prev);
      const activities = [...(next.get(systemId) || [])];
      const idx = activities.findIndex((a) => a.id === activityId);
      if (idx >= 0) {
        const current = activities[idx].inspection_type;
        const newType = current === 'NA' ? 'WITNESS' : current === 'WITNESS' ? 'HOLD' : 'NA';
        const updated = { ...activities[idx], inspection_type: newType as any };
        activities[idx] = updated;
        next.set(systemId, activities);
        upsertActivity.mutate(updated);
      }
      return next;
    });
  }, [upsertActivity]);

  const handleAddActivity = useCallback((systemId: string) => {
    setLocalActivities((prev) => {
      const next = new Map(prev);
      const activities = [...(next.get(systemId) || [])];
      activities.push({
        id: crypto.randomUUID(),
        system_id: systemId,
        activity_name: '',
        inspection_type: 'NA',
        notes: null,
        display_order: activities.length,
        isNew: true,
      });
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
    const act = (localActivities.get(systemId) || []).find((a) => a.id === activityId);
    if (act && act.activity_name.trim()) upsertActivity.mutate(act);
  }, [localActivities, upsertActivity]);

  const toggleSystem = (id: string) => {
    setOpenSystems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Stats
  const allActs = Array.from(localActivities.values()).flat();
  const wCount = allActs.filter((a) => a.inspection_type === 'WITNESS').length;
  const hCount = allActs.filter((a) => a.inspection_type === 'HOLD').length;

  const filtered = systems.filter(
    (s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.systemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingSystems || loadingActivities) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search systems..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">{systems.length} systems</Badge>
        {wCount > 0 && (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 gap-1 text-[10px]">
            <Eye className="w-3 h-3" />{wCount}W
          </Badge>
        )}
        {hCount > 0 && (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 gap-1 text-[10px]">
            <ShieldAlert className="w-3 h-3" />{hCount}H
          </Badge>
        )}
      </div>

      {/* System list */}
      <ScrollArea className="h-[calc(min(90vh,780px)-300px)]">
        <div className="space-y-1.5 pr-4">
          {filtered.map((system) => {
            const activities = localActivities.get(system.systemId) || [];
            const sW = activities.filter((a) => a.inspection_type === 'WITNESS').length;
            const sH = activities.filter((a) => a.inspection_type === 'HOLD').length;
            const isOpen = openSystems.has(system.systemId);

            return (
              <Collapsible key={system.systemId} open={isOpen} onOpenChange={() => toggleSystem(system.systemId)}>
                <Card className={cn('transition-all duration-200 overflow-hidden', isOpen ? 'border-primary/40 shadow-sm' : 'hover:border-border')}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{system.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">{system.systemCode}</Badge>
                          {system.isHydrocarbon && (
                            <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 text-[9px] px-1.5 py-0">HC</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sW > 0 && <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{sW}W</span>}
                        {sH > 0 && <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">{sH}H</span>}
                        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/60 px-4 pb-3 pt-2">
                      <div className="space-y-0.5">
                        {activities.map((activity) => (
                          <div key={activity.id} className="group flex items-center gap-1.5 rounded-md hover:bg-muted/50 py-1 px-1 transition-colors">
                            {/* Type toggle button */}
                            <button
                              onClick={() => cycleType(system.systemId, activity.id)}
                              className={cn(
                                'shrink-0 w-7 h-6 rounded text-[10px] font-bold transition-all flex items-center justify-center',
                                activity.inspection_type === 'WITNESS' && 'bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/40',
                                activity.inspection_type === 'HOLD' && 'bg-red-500/20 text-red-700 dark:text-red-400 ring-1 ring-red-400/40',
                                activity.inspection_type === 'NA' && 'bg-muted text-muted-foreground',
                              )}
                            >
                              {activity.inspection_type === 'NA' ? '—' : activity.inspection_type === 'WITNESS' ? 'W' : 'H'}
                            </button>

                            {/* Activity name */}
                            <Input
                              value={activity.activity_name}
                              onChange={(e) => handleNameChange(system.systemId, activity.id, e.target.value)}
                              onBlur={() => handleNameBlur(system.systemId, activity.id)}
                              placeholder="Activity name..."
                              className="flex-1 h-6 text-xs border-0 bg-transparent shadow-none focus-visible:ring-1 px-2"
                            />

                            {/* Remove */}
                            <button
                              onClick={() => handleRemoveActivity(system.systemId, activity.id, activity.isNew)}
                              className="shrink-0 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddActivity(system.systemId)}
                        className="h-6 text-[11px] text-muted-foreground gap-1 mt-1.5 px-2"
                      >
                        <Plus className="w-3 h-3" />
                        Add activity
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
