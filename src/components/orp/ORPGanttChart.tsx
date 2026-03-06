import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, ZoomIn, ZoomOut, ChevronRight, ChevronDown, ChevronsUpDown, GitBranch, Columns3, Route } from 'lucide-react';
import { CreateORPModal } from './CreateORPModal';

import { ORAActivityTaskSheet } from '@/components/tasks/ORAActivityTaskSheet';
import { getStatusLabel, getStatusBadgeClasses } from './utils/statusStyles';
import { cn } from '@/lib/utils';
import { useGanttBarResize } from '@/hooks/useGanttBarResize';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface ORPGanttChartProps {
  planId: string;
  deliverables: any[];
  searchQuery?: string;
  hideToolbar?: boolean;
}

const ZOOM_LEVELS = [0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const ROW_HEIGHT = 40;

const COL_WIDTHS = {
  index: 36,
  id: 90,
  name: 260,
  start: 72,
  end: 72,
  duration: 48,
  status: 96,
};

// Sequential hue rotation palette for ID badges
const ID_BADGE_PALETTE = [
  { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
  { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400' },
  { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400' },
  { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-700 dark:text-cyan-400' },
  { bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-400' },
];

type ColumnKey = 'index' | 'id' | 'start' | 'end' | 'duration' | 'status';
const TOGGLEABLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'index', label: '#' },
  { key: 'id', label: 'ID' },
  { key: 'start', label: 'Start' },
  { key: 'end', label: 'End' },
  { key: 'duration', label: 'Days' },
  { key: 'status', label: 'Status' },
];

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  IDN: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  ASS: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  SEL: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  DEF: { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400' },
  EXE: { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400' },
  OPR: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
  VCR: { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400' },
};

const BAR_COLORS: Record<string, string> = {
  IDN: 'bg-blue-400 dark:bg-blue-500',
  ASS: 'bg-amber-400 dark:bg-amber-500',
  SEL: 'bg-emerald-400 dark:bg-emerald-500',
  DEF: 'bg-teal-400 dark:bg-teal-500',
  EXE: 'bg-indigo-400 dark:bg-indigo-500',
  OPR: 'bg-purple-400 dark:bg-purple-500',
  VCR: 'bg-rose-400 dark:bg-rose-500',
};

const BAR_COLORS_MUTED: Record<string, string> = {
  IDN: 'bg-blue-200 dark:bg-blue-800',
  ASS: 'bg-amber-200 dark:bg-amber-800',
  SEL: 'bg-emerald-200 dark:bg-emerald-800',
  DEF: 'bg-teal-200 dark:bg-teal-800',
  EXE: 'bg-indigo-200 dark:bg-indigo-800',
  OPR: 'bg-purple-200 dark:bg-purple-800',
  VCR: 'bg-rose-200 dark:bg-rose-800',
};

const ZOOM_PRESETS = [
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
  { label: '24M', days: 730 },
];

function getPhasePrefix(code: string): string {
  if (!code) return '';
  if (code.startsWith('VCR-')) return 'VCR';
  return code.split('-')[0];
}

function getParentCode(code: string): string | null {
  if (!code) return null;
  const lastDotIdx = code.lastIndexOf('.');
  if (lastDotIdx === -1) return null;
  return code.substring(0, lastDotIdx);
}

function getCodeDepth(code: string): number {
  if (!code) return 0;
  return (code.match(/\./g) || []).length;
}

interface FlatRow {
  deliverable: any;
  depth: number;
  hasChildren: boolean;
  activityCode: string;
}

function buildHierarchyFromCodes(deliverables: any[]): {
  childrenMap: Map<string | null, any[]>;
  codeToDeliverable: Map<string, any>;
} {
  const codeToDeliverable = new Map<string, any>();
  deliverables.forEach(d => {
    const code = d.deliverable?.activity_code;
    if (code) codeToDeliverable.set(code, d);
  });

  const childrenMap = new Map<string | null, any[]>();
  deliverables.forEach(d => {
    const code = d.deliverable?.activity_code || '';
    const parentCode = getParentCode(code);
    const parentKey = parentCode && codeToDeliverable.has(parentCode) ? parentCode : null;
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey)!.push(d);
  });

  return { childrenMap, codeToDeliverable };
}

function buildVisibleRows(
  childrenMap: Map<string | null, any[]>,
  expandedCodes: Set<string>,
  parentKey: string | null = null,
  depth: number = 0
): FlatRow[] {
  const children = childrenMap.get(parentKey) || [];
  const rows: FlatRow[] = [];
  for (const d of children) {
    const code = d.deliverable?.activity_code || '';
    const hasChildren = (childrenMap.get(code) || []).length > 0;
    rows.push({ deliverable: d, depth, hasChildren, activityCode: code });
    if (hasChildren && expandedCodes.has(code)) {
      rows.push(...buildVisibleRows(childrenMap, expandedCodes, code, depth + 1));
    }
  }
  return rows;
}

function getParentDateRange(
  code: string,
  childrenMap: Map<string | null, any[]>
): { minStart: Date | null; maxEnd: Date | null } {
  const children = childrenMap.get(code) || [];
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const d of children) {
    if (d.start_date) {
      const s = parseISO(d.start_date);
      if (!minStart || s < minStart) minStart = s;
    }
    if (d.end_date) {
      const e = parseISO(d.end_date);
      if (!maxEnd || e > maxEnd) maxEnd = e;
    }
    const childCode = d.deliverable?.activity_code || '';
    const sub = getParentDateRange(childCode, childrenMap);
    if (sub.minStart && (!minStart || sub.minStart < minStart)) minStart = sub.minStart;
    if (sub.maxEnd && (!maxEnd || sub.maxEnd > maxEnd)) maxEnd = sub.maxEnd;
  }

  return { minStart, maxEnd };
}

// Critical path computation
function computeCriticalPath(rows: FlatRow[], getBarPos: (s: string, e: string) => { left: number; width: number }): Set<string> {
  // Build leaf activities with dates and predecessor info
  const leaves = rows.filter(r => !r.hasChildren && r.deliverable.start_date && r.deliverable.end_date);
  if (leaves.length === 0) return new Set();

  // Build code/id lookup
  const codeToIdx = new Map<string, number>();
  leaves.forEach((r, i) => {
    const code = r.deliverable.deliverable?.activity_code;
    const id = r.deliverable.deliverable?.id || r.deliverable.id;
    if (code) codeToIdx.set(code, i);
    if (id) codeToIdx.set(id, i);
    // Also strip prefixes
    if (id && typeof id === 'string') {
      const stripped = id.replace(/^(ora-|ws-)/, '');
      codeToIdx.set(stripped, i);
    }
  });

  const n = leaves.length;
  const durations: number[] = leaves.map(r => differenceInDays(parseISO(r.deliverable.end_date), parseISO(r.deliverable.start_date)));
  const successors: number[][] = Array.from({ length: n }, () => []);
  const predecessors: number[][] = Array.from({ length: n }, () => []);

  leaves.forEach((r, i) => {
    const predIds: string[] = r.deliverable._predecessorIds || [];
    predIds.forEach(predCode => {
      const predIdx = codeToIdx.get(predCode);
      if (predIdx !== undefined && predIdx !== i) {
        predecessors[i].push(predIdx);
        successors[predIdx].push(i);
      }
    });
  });

  // Forward pass: earliest start/finish
  const es = new Array(n).fill(0);
  const ef = new Array(n).fill(0);
  // Topological order (BFS using in-degree)
  const inDeg = predecessors.map(p => p.length);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (inDeg[i] === 0) queue.push(i);
  const order: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of successors[u]) {
      es[v] = Math.max(es[v], es[u] + durations[u]);
      inDeg[v]--;
      if (inDeg[v] === 0) queue.push(v);
    }
  }
  for (let i = 0; i < n; i++) ef[i] = es[i] + durations[i];

  // Project end
  const projectEnd = Math.max(...ef);

  // Backward pass: latest start/finish
  const lf = new Array(n).fill(projectEnd);
  const ls = new Array(n).fill(0);
  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    for (const v of successors[u]) {
      lf[u] = Math.min(lf[u], ls[v]);
    }
    ls[u] = lf[u] - durations[u];
  }

  // Critical = zero float
  const criticalSet = new Set<string>();
  for (let i = 0; i < n; i++) {
    if (Math.abs(es[i] - ls[i]) < 1) {
      criticalSet.add(leaves[i].deliverable.id);
    }
  }
  return criticalSet;
}

export const ORPGanttChart: React.FC<ORPGanttChartProps> = ({ planId, deliverables, searchQuery: externalSearchQuery, hideToolbar }) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  
  const [selectedOraActivity, setSelectedOraActivity] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [showRelationships, setShowRelationships] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => new Set(['index', 'id', 'start', 'status']));
  const [hasInitialZoom, setHasInitialZoom] = useState(false);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const leftPanelWidth = useMemo(() => {
    let w = COL_WIDTHS.name;
    for (const key of visibleColumns) {
      w += COL_WIDTHS[key];
    }
    return w;
  }, [visibleColumns]);

  const searchQuery = externalSearchQuery ?? internalSearchQuery;

  const filteredDeliverables = useMemo(() => {
    if (!searchQuery.trim()) return deliverables;
    const query = searchQuery.toLowerCase();
    return deliverables.filter(d =>
      d.deliverable?.name?.toLowerCase().includes(query) ||
      d.deliverable?.activity_code?.toLowerCase().includes(query)
    );
  }, [deliverables, searchQuery]);

  const { childrenMap } = useMemo(() => buildHierarchyFromCodes(filteredDeliverables), [filteredDeliverables]);

  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => new Set<string>());

  const visibleRows = useMemo(
    () => buildVisibleRows(childrenMap, expandedCodes),
    [childrenMap, expandedCodes]
  );

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    const codes = new Set<string>();
    for (const [key] of childrenMap) {
      if (key !== null) codes.add(key);
    }
    filteredDeliverables.forEach(d => {
      const code = d.deliverable?.activity_code;
      if (code && (childrenMap.get(code) || []).length > 0) codes.add(code);
    });
    setExpandedCodes(codes);
  };

  const collapseAll = () => setExpandedCodes(new Set());

  // Date range
  const dates = useMemo(() => {
    return filteredDeliverables
      .filter(d => d.start_date && d.end_date)
      .flatMap(d => [parseISO(d.start_date), parseISO(d.end_date)]);
  }, [filteredDeliverables]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!dates.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const padMin = addDays(min, -7);
    const padMax = addDays(max, 14);
    return { minDate: padMin, maxDate: padMax, totalDays: Math.max(differenceInDays(padMax, padMin), 60) };
  }, [dates]);

  const dayWidth = 28 * zoomLevel;
  const timelineWidth = totalDays * dayWidth;

  const monthMarkers = useMemo(() => {
    const markers: { label: string; left: number }[] = [];
    let current = new Date(minDate);
    current.setDate(1);
    if (current < minDate) current.setMonth(current.getMonth() + 1);
    while (current <= maxDate) {
      const dayOffset = differenceInDays(current, minDate);
      markers.push({ label: format(current, 'MMM yyyy'), left: dayOffset * dayWidth });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [minDate, maxDate, dayWidth]);

  const weekMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let i = 0; i < totalDays; i += 7) markers.push(i * dayWidth);
    return markers;
  }, [totalDays, dayWidth]);

  const getBarPosition = useCallback((startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const left = differenceInDays(start, minDate) * dayWidth;
    const width = Math.max(differenceInDays(end, start) * dayWidth, 8);
    return { left, width };
  }, [minDate, dayWidth]);

  // Critical path IDs
  const criticalPathIds = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();
    return computeCriticalPath(visibleRows, getBarPosition);
  }, [showCriticalPath, visibleRows, getBarPosition]);

  const handleBarResize = useCallback(async (activityId: string, newStart: Date, newEnd: Date) => {
    const startStr = format(newStart, 'yyyy-MM-dd');
    const endStr = format(newEnd, 'yyyy-MM-dd');
    const durationDays = differenceInDays(newEnd, newStart);

    // Optimistically update the query cache so bars don't snap back
    queryClient.setQueriesData({ queryKey: ['orp-plan'] }, (old: any) => {
      if (!old?.deliverables) return old;
      return {
        ...old,
        deliverables: old.deliverables.map((d: any) =>
          d.id === activityId
            ? { ...d, start_date: startStr, end_date: endStr, duration_days: durationDays }
            : d
        ),
      };
    });

    // Strip prefix to get the real DB id
    const dbId = activityId.replace(/^(ora-|ws-)/, '');

    try {
      await supabase
        .from('ora_plan_activities')
        .update({ start_date: startStr, end_date: endStr, duration_days: durationDays })
        .eq('id', dbId);
    } catch (err) {
      console.error('Failed to update activity dates:', err);
    }

    // Also update wizard_state dates for ws- activities
    if (activityId.startsWith('ws-')) {
      try {
        const { data: plan } = await supabase
          .from('orp_plans')
          .select('wizard_state')
          .eq('id', planId)
          .single();
        if (plan?.wizard_state) {
          const ws = plan.wizard_state as any;
          if (ws.activities && Array.isArray(ws.activities)) {
            const updated = ws.activities.map((a: any) =>
              a.id === dbId
                ? { ...a, startDate: startStr, start_date: startStr, endDate: endStr, end_date: endStr }
                : a
            );
            await supabase
              .from('orp_plans')
              .update({ wizard_state: { ...ws, activities: updated } })
              .eq('id', planId);
          }
        }
      } catch (err) {
        console.error('Failed to update wizard_state dates:', err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
  }, [queryClient, planId]);

  const { draggingId, previewLeft, previewWidth, handleMouseDown, wasDragging } = useGanttBarResize({
    minDate,
    dayWidth,
    onResize: handleBarResize,
  });

  const handleZoomIn = useCallback(() => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    if (idx < ZOOM_LEVELS.length - 1) setZoomLevel(ZOOM_LEVELS[idx + 1]);
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    if (idx > 0) setZoomLevel(ZOOM_LEVELS[idx - 1]);
  }, [zoomLevel]);

  const setZoomToFitDays = (targetDays: number) => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const newZoom = containerWidth / (targetDays * 28);
    const closest = ZOOM_LEVELS.reduce((prev, curr) =>
      Math.abs(curr - newZoom) < Math.abs(prev - newZoom) ? curr : prev
    );
    setZoomLevel(closest);
  };

  useEffect(() => {
    if (!hasInitialZoom && scrollContainerRef.current && dates.length > 0) {
      const timer = setTimeout(() => {
        setZoomToFitDays(180);
        setHasInitialZoom(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dates.length, hasInitialZoom]);

  const isAllExpanded = useMemo(() => {
    const parentCodes: string[] = [];
    filteredDeliverables.forEach(d => {
      const code = d.deliverable?.activity_code;
      if (code && (childrenMap.get(code) || []).length > 0) parentCodes.push(code);
    });
    return parentCodes.length > 0 && parentCodes.every(c => expandedCodes.has(c));
  }, [expandedCodes, filteredDeliverables, childrenMap]);

  const todayPosition = useMemo(() => {
    const today = new Date();
    const offset = differenceInDays(today, minDate) * dayWidth;
    return offset;
  }, [minDate, dayWidth]);

  const openActivitySheet = useCallback((deliverable: any) => {
    // Build list of sibling activities for prerequisite picker
    const siblingActivities = filteredDeliverables
      .filter(d => d.deliverable?.activity_code && d.id !== deliverable.id)
      .map(d => ({
        id: d.id,
        activity_code: d.deliverable?.activity_code,
        name: d.deliverable?.name,
      }));

    setSelectedOraActivity({
      id: deliverable.id,
      title: deliverable.deliverable?.name || '',
      description: deliverable.deliverable?.description || '',
      type: 'ora_activity',
      status: deliverable.status === 'COMPLETED' ? 'completed' : deliverable.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
      metadata: {
        activity_name: deliverable.deliverable?.name,
        activity_code: deliverable.deliverable?.activity_code,
        description: deliverable.deliverable?.description || '',
        plan_id: planId,
        deliverable_id: deliverable.deliverable?.id || deliverable.id,
        ora_plan_activity_id: deliverable.id,
        start_date: deliverable.start_date,
        end_date: deliverable.end_date,
        completion_percentage: deliverable.completion_percentage || 0,
        predecessor_ids: deliverable._predecessorIds || [],
        sibling_activities: siblingActivities,
      },
      priority: 'medium',
      created_at: deliverable.created_at || new Date().toISOString(),
    });
  }, [planId, filteredDeliverables]);

  // Early return - no data
  if (!dates.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gantt Chart</CardTitle>
            {!hideToolbar && (
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search deliverables..." value={internalSearchQuery} onChange={(e) => setInternalSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Button onClick={() => setShowAddItem(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add ORA Item
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No timeline data available</p>
              <p className="text-sm mt-2">Add start and end dates to deliverables to see the Gantt chart</p>
            </div>
          </div>
        </CardContent>
        {showAddItem && <CreateORPModal open={showAddItem} onOpenChange={setShowAddItem} onSuccess={() => setShowAddItem(false)} />}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gantt Chart</CardTitle>
          <div className="flex items-center gap-2">
            {/* Expand/Collapse toggle */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={isAllExpanded ? collapseAll : expandAll}>
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{isAllExpanded ? 'Collapse All' : 'Expand All'}</p></TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-border" />

              {/* Relationships toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showRelationships ? 'default' : 'outline'}
                    size="icon"
                    className={cn("h-7 w-7", showRelationships && "bg-primary text-primary-foreground")}
                    onClick={() => setShowRelationships(!showRelationships)}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Relations</p></TooltipContent>
              </Tooltip>

              {/* Critical Path toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showCriticalPath ? 'default' : 'outline'}
                    size="icon"
                    className={cn("h-7 w-7", showCriticalPath && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                    onClick={() => setShowCriticalPath(!showCriticalPath)}
                  >
                    <Route className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Critical Path</p></TooltipContent>
              </Tooltip>

              {/* Column visibility toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <Columns3 className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="end">
                <div className="space-y-1">
                  {TOGGLEABLE_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
                      <Checkbox
                        checked={visibleColumns.has(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                        className="h-3.5 w-3.5"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Columns</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex-1 min-w-8" />

            {/* Zoom presets */}
            <div className="flex items-center gap-1">
              {ZOOM_PRESETS.map(p => (
                <Button key={p.label} variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium" onClick={() => setZoomToFitDays(p.days)}>
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} disabled={zoomLevel === ZOOM_LEVELS[0]}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {!hideToolbar && (
              <>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search deliverables..." value={internalSearchQuery} onChange={(e) => setInternalSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Button onClick={() => setShowAddItem(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add ORA Item
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-background">
          {/* Scrollable area with sticky header */}
          <div className="max-h-[70vh] overflow-y-auto" ref={scrollContainerRef}>
            {/* Sticky header row */}
            <div className="flex sticky top-0 z-20 bg-background">
              <div className="shrink-0 border-r bg-muted/30" style={{ width: leftPanelWidth }}>
                <div className="flex items-center h-9 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {visibleColumns.has('index') && <div className="px-1 text-center" style={{ width: COL_WIDTHS.index }}>#</div>}
                  {visibleColumns.has('id') && <div className="px-1 border-r border-border/40" style={{ width: COL_WIDTHS.id }}>ID</div>}
                  <div className="px-1.5 border-r border-border/40" style={{ width: COL_WIDTHS.name }}>Activity</div>
                  {visibleColumns.has('start') && <div className="px-1 text-center" style={{ width: COL_WIDTHS.start }}>Start</div>}
                  {visibleColumns.has('end') && <div className="px-1 text-center" style={{ width: COL_WIDTHS.end }}>End</div>}
                  {visibleColumns.has('duration') && <div className="px-1 text-center" style={{ width: COL_WIDTHS.duration }}>Days</div>}
                  {visibleColumns.has('status') && <div className="px-1 text-center" style={{ width: COL_WIDTHS.status }}>Status</div>}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div style={{ width: timelineWidth, minWidth: '100%' }}>
                  <div className="h-9 relative border-b bg-muted/20">
                    {monthMarkers.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full flex items-center px-2 border-l border-border/40" style={{ left: m.left }}>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{m.label}</span>
                      </div>
                    ))}
                    {todayPosition > 0 && todayPosition < timelineWidth && (
                      <div className="absolute top-0 h-full flex flex-col items-center justify-end pb-0.5" style={{ left: todayPosition }}>
                        <span className="text-[8px] font-bold text-primary whitespace-nowrap bg-primary/10 px-1 rounded">{format(new Date(), 'dd MMM')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity rows */}
            <div className="flex">
              {/* Left panel rows */}
              <div className="shrink-0 border-r" style={{ width: leftPanelWidth }}>
                {visibleRows.map((row, index) => {
                  const { deliverable, depth, hasChildren, activityCode } = row;
                  const idColors = ID_BADGE_PALETTE[index % ID_BADGE_PALETTE.length];
                  const isExpanded = expandedCodes.has(activityCode);
                  const isParent = hasChildren;
                  const hasDates = deliverable.start_date && deliverable.end_date;
                  const durationDays = hasDates ? differenceInDays(parseISO(deliverable.end_date), parseISO(deliverable.start_date)) : null;
                  const isCritical = showCriticalPath && criticalPathIds.has(deliverable.id);

                  return (
                    <div
                      key={deliverable.id}
                      className={cn(
                        "flex items-center border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors",
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                        isParent && 'font-medium',
                        isCritical && 'bg-destructive/5'
                      )}
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => openActivitySheet(deliverable)}
                    >
                      {visibleColumns.has('index') && (
                        <div className="px-1 text-center text-[10px] text-muted-foreground" style={{ width: COL_WIDTHS.index }}>
                          {index + 1}
                        </div>
                      )}
                      {visibleColumns.has('id') && (
                        <div className="px-1 flex items-center border-r border-border/40" style={{ width: COL_WIDTHS.id }}>
                          {activityCode ? (
                            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold whitespace-nowrap", idColors.bg, idColors.text)}>
                              {activityCode}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      )}
                      <div className="px-1.5 overflow-hidden flex items-center gap-0.5 border-r border-border/40" style={{ width: COL_WIDTHS.name }}>
                        <div style={{ paddingLeft: depth * 16 }} className="flex items-center gap-1 min-w-0">
                          {hasChildren ? (
                            <button
                              className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-accent/50"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(activityCode); }}
                            >
                              {isExpanded
                                ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              }
                            </button>
                          ) : (
                            <span className="shrink-0 w-4" />
                          )}
                          <span className={cn(
                            "text-[11px] leading-snug",
                            isParent ? "font-semibold text-foreground" : "text-foreground/90",
                            isCritical && "text-destructive font-semibold"
                          )} title={deliverable.deliverable?.name}>
                            {deliverable.deliverable?.name}
                          </span>
                        </div>
                      </div>
                      {visibleColumns.has('start') && (
                        <div className="px-1 text-center" style={{ width: COL_WIDTHS.start }}>
                          <span className="text-[10px] text-muted-foreground">
                            {hasDates ? format(parseISO(deliverable.start_date), 'dd MMM') : '—'}
                          </span>
                        </div>
                      )}
                      {visibleColumns.has('end') && (
                        <div className="px-1 text-center" style={{ width: COL_WIDTHS.end }}>
                          <span className="text-[10px] text-muted-foreground">
                            {hasDates ? format(parseISO(deliverable.end_date), 'dd MMM') : '—'}
                          </span>
                        </div>
                      )}
                      {visibleColumns.has('duration') && (
                        <div className="px-1 text-center" style={{ width: COL_WIDTHS.duration }}>
                          <span className="text-[10px] font-medium">{durationDays !== null ? `${durationDays}d` : '—'}</span>
                        </div>
                      )}
                      {visibleColumns.has('status') && (
                        <div className="px-1 flex items-center justify-center" style={{ width: COL_WIDTHS.status }}>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-5", getStatusBadgeClasses(deliverable.status))}>
                            {getStatusLabel(deliverable.status)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Timeline rows */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: timelineWidth, minWidth: '100%' }} className="relative">
                  {visibleRows.map((row, index) => {
                    const { deliverable, hasChildren, activityCode } = row;
                    const prefix = getPhasePrefix(activityCode);
                    const barColor = BAR_COLORS[prefix] || 'bg-primary';
                    const isParent = hasChildren;
                    const hasDates = deliverable.start_date && deliverable.end_date;
                    const isCritical = showCriticalPath && criticalPathIds.has(deliverable.id);

                    let barPos: { left: number; width: number } | null = null;
                    if (isParent) {
                      const range = getParentDateRange(activityCode, childrenMap);
                      if (range.minStart && range.maxEnd) {
                        const start = range.minStart;
                        const end = range.maxEnd;
                        const left = differenceInDays(start, minDate) * dayWidth;
                        const width = Math.max(differenceInDays(end, start) * dayWidth, 8);
                        barPos = { left, width };
                      }
                    } else if (hasDates) {
                      barPos = getBarPosition(deliverable.start_date, deliverable.end_date);
                    }

                    return (
                      <div
                        key={deliverable.id}
                        className={cn(
                          "relative border-b last:border-b-0",
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                          isCritical && 'bg-destructive/5'
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {weekMarkers.map((left, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-border/15" style={{ left }} />
                        ))}
                        {todayPosition > 0 && todayPosition < timelineWidth && (
                          <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary/60 z-10" style={{ left: todayPosition }} />
                        )}

                        {barPos && isParent && (() => {
                          const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                          const range = getParentDateRange(activityCode, childrenMap);
                          const parentDuration = range.minStart && range.maxEnd ? differenceInDays(range.maxEnd, range.minStart) : null;

                          return (
                            <div
                              className={cn(
                                "absolute top-2 rounded shadow-sm overflow-hidden",
                                mutedColor
                              )}
                              style={{ left: barPos.left, width: barPos.width, height: ROW_HEIGHT - 16 }}
                              title={`${deliverable.deliverable?.name} (summary)`}
                            >
                              <div className={cn("absolute h-full rounded-l", barColor, "opacity-40")} style={{ width: '100%' }} />
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">
                                  {parentDuration !== null ? `${parentDuration}d` : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {barPos && !isParent && (() => {
                          const isDragging = draggingId === deliverable.id;
                          const barL = isDragging && previewLeft !== null ? previewLeft : barPos.left;
                          const barW = isDragging && previewWidth !== null ? previewWidth : barPos.width;
                          const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                          const completion = deliverable.completion_percentage || 0;

                          return (
                            <div
                              className={cn(
                                "absolute top-2 rounded shadow-sm overflow-hidden cursor-grab hover:shadow-md transition-all group",
                                mutedColor,
                                isDragging && "ring-2 ring-primary/50 shadow-lg cursor-grabbing",
                                isCritical && "ring-2 ring-destructive/70"
                              )}
                              style={{ left: barL, width: barW, height: ROW_HEIGHT - 16 }}
                              onMouseDown={(e) => {
                                // Only initiate move-drag from the bar body (not edge handles)
                                if (!(e.target as HTMLElement).dataset.edge) {
                                  handleMouseDown(e, 'move', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date));
                                }
                              }}
                              onClick={(e) => {
                                if (wasDragging()) {
                                  e.stopPropagation();
                                  return;
                                }
                                openActivitySheet(deliverable);
                              }}
                            >
                              <div
                                className={cn("absolute h-full rounded-l", barColor)}
                                style={{ width: `${completion}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">
                                  {completion}%
                                </span>
                              </div>
                              <div
                                data-edge="left"
                                className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                                onMouseDown={(e) => handleMouseDown(e, 'left', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date))}
                              />
                              <div
                                data-edge="right"
                                className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                                onMouseDown={(e) => handleMouseDown(e, 'right', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date))}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  {/* Critical path red connecting line */}
                  {showCriticalPath && criticalPathIds.size > 0 && (() => {
                    // Collect critical path bar centers sorted by left position
                    const criticalBars: { x: number; y: number; left: number; right: number }[] = [];
                    visibleRows.forEach((row, rowIdx) => {
                      if (!criticalPathIds.has(row.deliverable.id)) return;
                      if (row.hasChildren || !row.deliverable.start_date || !row.deliverable.end_date) return;
                      const pos = getBarPosition(row.deliverable.start_date, row.deliverable.end_date);
                      criticalBars.push({
                        x: pos.left + pos.width / 2,
                        y: rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
                        left: pos.left,
                        right: pos.left + pos.width,
                      });
                    });
                    criticalBars.sort((a, b) => a.left - b.left);

                    if (criticalBars.length < 2) return null;

                    // Build path connecting end of one bar to start of next, through center
                    let pathD = '';
                    for (let i = 0; i < criticalBars.length - 1; i++) {
                      const from = criticalBars[i];
                      const to = criticalBars[i + 1];
                      pathD += `M${from.right},${from.y} L${to.left},${to.y} `;
                    }

                    return (
                      <svg
                        className="absolute top-0 left-0 pointer-events-none z-15"
                        style={{ width: timelineWidth, height: visibleRows.length * ROW_HEIGHT }}
                      >
                        <path
                          d={pathD}
                          fill="none"
                          stroke="hsl(var(--destructive))"
                          strokeWidth="2"
                          strokeDasharray="6,3"
                          opacity="0.8"
                        />
                      </svg>
                    );
                  })()}

                  {/* Relationship arrows SVG overlay */}
                  {showRelationships && (
                    <svg
                      className="absolute top-0 left-0 pointer-events-none z-20"
                      style={{ width: timelineWidth, height: visibleRows.length * ROW_HEIGHT }}
                    >
                      <defs>
                        <marker id="rel-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--destructive))" />
                        </marker>
                      </defs>
                      {visibleRows.map((row, rowIdx) => {
                        const predecessorIds = row.deliverable._predecessorIds || [];
                        if (!predecessorIds.length) return null;

                        const hasDates = row.deliverable.start_date && row.deliverable.end_date;
                        if (!hasDates) return null;
                        const toPos = getBarPosition(row.deliverable.start_date, row.deliverable.end_date);
                        const toY = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                        const toX = toPos.left;

                        return predecessorIds.map((predCode: string) => {
                          const predIdx = visibleRows.findIndex(r => {
                            const code = r.deliverable.deliverable?.activity_code;
                            const id = r.deliverable.deliverable?.id || r.deliverable.id;
                            const strippedId = typeof id === 'string' ? id.replace(/^(ora-|ws-)/, '') : '';
                            return code === predCode || id === predCode || strippedId === predCode ||
                                   predCode === `ora-${strippedId}` || predCode === `ws-${strippedId}`;
                          });
                          if (predIdx === -1) return null;
                          const predRow = visibleRows[predIdx];
                          const predHasDates = predRow.deliverable.start_date && predRow.deliverable.end_date;
                          if (!predHasDates) return null;
                          const fromPos = getBarPosition(predRow.deliverable.start_date, predRow.deliverable.end_date);
                          const fromX = fromPos.left + fromPos.width;
                          const fromY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                          const midX = fromX + 10;
                          const path = `M${fromX},${fromY} L${midX},${fromY} L${midX},${toY} L${toX},${toY}`;

                          return (
                            <path
                              key={`${predCode}-${row.activityCode}`}
                              d={path}
                              fill="none"
                              stroke="hsl(var(--destructive))"
                              strokeWidth="1.5"
                              markerEnd="url(#rel-arrow)"
                              opacity="0.7"
                            />
                          );
                        });
                      })}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </CardContent>

      {showAddItem && <CreateORPModal open={showAddItem} onOpenChange={setShowAddItem} onSuccess={() => setShowAddItem(false)} />}
      <ORAActivityTaskSheet
        task={selectedOraActivity}
        open={!!selectedOraActivity}
        onOpenChange={(open) => !open && setSelectedOraActivity(null)}
      />
    </Card>
  );
};
