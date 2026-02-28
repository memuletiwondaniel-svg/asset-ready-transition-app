import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ZoomIn, ZoomOut, Maximize2, ChevronRight, ChevronDown, ChevronsUpDown, GitBranch } from 'lucide-react';
import { CreateORPModal } from './CreateORPModal';
import { ORPDeliverableModal } from './ORPDeliverableModal';
import { ORAActivityTaskSheet } from '@/components/tasks/ORAActivityTaskSheet';
import { getStatusLabel, getStatusBadgeClasses } from './utils/statusStyles';
import { cn } from '@/lib/utils';
import { useGanttBarResize } from '@/hooks/useGanttBarResize';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
const LEFT_PANEL_WIDTH = Object.values(COL_WIDTHS).reduce((a, b) => a + b, 0);

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
  // VCR activity codes start with "VCR-"
  if (code.startsWith('VCR-')) return 'VCR';
  return code.split('-')[0];
}

// Build hierarchy from activity_code dot notation
// IDN-01 is parent of IDN-01.01, which is parent of IDN-01.01.01
function getParentCode(code: string): string | null {
  if (!code) return null;
  const lastDotIdx = code.lastIndexOf('.');
  if (lastDotIdx === -1) return null; // top-level
  return code.substring(0, lastDotIdx);
}

function getCodeDepth(code: string): number {
  if (!code) return 0;
  // Count dots: IDN-01 = 0, IDN-01.01 = 1, IDN-01.01.01 = 2
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
    // If parent exists in our list, nest under it; otherwise it's a root
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

export const ORPGanttChart: React.FC<ORPGanttChartProps> = ({ planId, deliverables, searchQuery: externalSearchQuery, hideToolbar }) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [selectedOraActivity, setSelectedOraActivity] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [showRelationships, setShowRelationships] = useState(false);

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

  // Default expand: top-level parents expanded so activities are visible
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => {
    const roots = (childrenMap.get(null) || []);
    const rootCodes = new Set<string>();
    roots.forEach(d => {
      const code = d.deliverable?.activity_code || '';
      if (code && (childrenMap.get(code) || []).length > 0) rootCodes.add(code);
    });
    return rootCodes;
  });

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
    const allParents = new Set<string>();
    for (const [key] of childrenMap) {
      if (key !== null) {
        // check if this key is itself a parent
        const parentCode = getParentCode(key);
        if (parentCode !== null) allParents.add(parentCode);
      }
    }
    // Add all codes that have children
    for (const [key, children] of childrenMap) {
      if (key !== null && children.length > 0) {
        // key is activity code of parent - but we need to add codes that ARE parents
      }
    }
    // Simpler: just add all keys that are non-null
    const codes = new Set<string>();
    for (const [key] of childrenMap) {
      if (key !== null) codes.add(key);
    }
    // Also add all activity codes that have children
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

  const handleBarResize = useCallback(async (activityId: string, newStart: Date, newEnd: Date) => {
    const startStr = format(newStart, 'yyyy-MM-dd');
    const endStr = format(newEnd, 'yyyy-MM-dd');
    const durationDays = differenceInDays(newEnd, newStart);
    await supabase
      .from('ora_plan_activities')
      .update({ start_date: startStr, end_date: endStr, duration_days: durationDays })
      .eq('id', activityId);
    queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
  }, [queryClient]);

  const { draggingId, previewLeft, previewWidth, handleMouseDown } = useGanttBarResize({
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
            {/* Expand/Collapse */}
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-medium gap-1" onClick={expandAll}>
              <ChevronsUpDown className="w-3 h-3" /> Expand
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-medium" onClick={collapseAll}>
              Collapse
            </Button>

            <div className="w-px h-5 bg-border" />

            {/* Relationships toggle */}
            <Button
              variant={showRelationships ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 px-2 text-[10px] font-medium gap-1"
              onClick={() => setShowRelationships(!showRelationships)}
            >
              <GitBranch className="w-3 h-3" />
              Relations
            </Button>

            <div className="w-px h-5 bg-border" />

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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)} title="Fit to screen">
                <Maximize2 className="h-4 w-4" />
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
          {/* Header row */}
          <div className="flex">
            <div className="shrink-0 border-r bg-muted/30" style={{ width: LEFT_PANEL_WIDTH }}>
              <div className="flex items-center h-9 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="px-1 text-center" style={{ width: COL_WIDTHS.index }}>#</div>
                <div className="px-1 border-r border-border/40" style={{ width: COL_WIDTHS.id }}>ID</div>
                <div className="px-1.5 border-r border-border/40" style={{ width: COL_WIDTHS.name }}>Activity</div>
                <div className="px-1 text-center" style={{ width: COL_WIDTHS.start }}>Start</div>
                <div className="px-1 text-center" style={{ width: COL_WIDTHS.end }}>End</div>
                <div className="px-1 text-center" style={{ width: COL_WIDTHS.duration }}>Days</div>
                <div className="px-1 text-center" style={{ width: COL_WIDTHS.status }}>Status</div>
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
                </div>
              </div>
            </div>
          </div>

          {/* Activity rows */}
          <div className="max-h-[60vh] overflow-y-auto" ref={scrollContainerRef}>
            <div className="flex">
              {/* Left panel rows */}
              <div className="shrink-0 border-r" style={{ width: LEFT_PANEL_WIDTH }}>
                {visibleRows.map((row, index) => {
                  const { deliverable, depth, hasChildren, activityCode } = row;
                  const prefix = getPhasePrefix(activityCode);
                  const idColors = PHASE_COLORS[prefix] || { bg: 'bg-muted', text: 'text-foreground' };
                  const isExpanded = expandedCodes.has(activityCode);
                  const isParent = hasChildren;
                  const hasDates = deliverable.start_date && deliverable.end_date;
                  const durationDays = hasDates ? differenceInDays(parseISO(deliverable.end_date), parseISO(deliverable.start_date)) : null;

                  return (
                    <div
                      key={deliverable.id}
                      className={cn(
                        "flex items-center border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors",
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                        isParent && 'font-medium'
                      )}
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => {
                        if (deliverable._isOraActivity) {
                          // Convert to UserTask-like shape for ORAActivityTaskSheet
                          setSelectedOraActivity({
                            id: deliverable.id,
                            title: deliverable.deliverable?.name || '',
                            description: deliverable.deliverable?.description || '',
                            type: 'ora_activity',
                            status: deliverable.status === 'COMPLETED' ? 'completed' : deliverable.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
                            metadata: {
                              activity_name: deliverable.deliverable?.name,
                              activity_code: deliverable.deliverable?.activity_code,
                              plan_id: planId,
                              deliverable_id: deliverable.deliverable?.id,
                              start_date: deliverable.start_date,
                              end_date: deliverable.end_date,
                            },
                            priority: 'medium',
                            created_at: deliverable.created_at || new Date().toISOString(),
                          });
                        } else {
                          setSelectedDeliverable(deliverable);
                        }
                      }}
                    >
                      <div className="px-1 text-center text-[10px] text-muted-foreground" style={{ width: COL_WIDTHS.index }}>
                        {index + 1}
                      </div>
                      <div className="px-1 flex items-center border-r border-border/40" style={{ width: COL_WIDTHS.id }}>
                        {activityCode ? (
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold whitespace-nowrap", idColors.bg, idColors.text)}>
                            {activityCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
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
                            isParent ? "font-semibold text-foreground" : "text-foreground/90"
                          )} title={deliverable.deliverable?.name}>
                            {deliverable.deliverable?.name}
                          </span>
                        </div>
                      </div>
                      <div className="px-1 text-center" style={{ width: COL_WIDTHS.start }}>
                        <span className="text-[10px] text-muted-foreground">
                          {hasDates ? format(parseISO(deliverable.start_date), 'dd MMM') : '—'}
                        </span>
                      </div>
                      <div className="px-1 text-center" style={{ width: COL_WIDTHS.end }}>
                        <span className="text-[10px] text-muted-foreground">
                          {hasDates ? format(parseISO(deliverable.end_date), 'dd MMM') : '—'}
                        </span>
                      </div>
                      <div className="px-1 text-center" style={{ width: COL_WIDTHS.duration }}>
                        <span className="text-[10px] font-medium">{durationDays !== null ? `${durationDays}d` : '—'}</span>
                      </div>
                      <div className="px-1 flex items-center justify-center" style={{ width: COL_WIDTHS.status }}>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-5", getStatusBadgeClasses(deliverable.status))}>
                          {getStatusLabel(deliverable.status)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timeline rows */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: timelineWidth, minWidth: '100%' }}>
                  {visibleRows.map((row, index) => {
                    const { deliverable, hasChildren, activityCode } = row;
                    const prefix = getPhasePrefix(activityCode);
                    const barColor = BAR_COLORS[prefix] || 'bg-primary';
                    const isParent = hasChildren;
                    const hasDates = deliverable.start_date && deliverable.end_date;

                    // Parent summary bar from children date range
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
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {weekMarkers.map((left, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-border/15" style={{ left }} />
                        ))}

                        {barPos && isParent && (
                          <div
                            className={cn(
                              "absolute rounded-sm transition-all border-2",
                              barColor.replace('bg-', 'border-'),
                              "bg-transparent opacity-60"
                            )}
                            style={{ left: barPos.left, width: barPos.width, top: ROW_HEIGHT / 2 - 4, height: 8 }}
                            title={`${deliverable.deliverable?.name} (summary)`}
                          >
                            <div className={cn("h-full rounded-sm", barColor, "opacity-30")} />
                          </div>
                        )}

                        {barPos && !isParent && (() => {
                          const isDragging = draggingId === deliverable.id;
                          const barL = isDragging && previewLeft !== null ? previewLeft : barPos.left;
                          const barW = isDragging && previewWidth !== null ? previewWidth : barPos.width;
                          const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                          const completion = deliverable.completion_percentage || 0;

                          return (
                            <div
                              className={cn(
                                "absolute top-2 rounded shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all group",
                                mutedColor,
                                isDragging && "ring-2 ring-primary/50 shadow-lg"
                              )}
                              style={{ left: barL, width: barW, height: ROW_HEIGHT - 16 }}
                              onClick={() => !isDragging && setSelectedDeliverable(deliverable)}
                            >
                              {/* Progress fill */}
                              <div
                                className={cn("absolute h-full rounded-l", barColor)}
                                style={{ width: `${completion}%` }}
                              />
                              {/* Label */}
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">
                                  {completion}%
                                </span>
                              </div>
                              {/* Left resize handle */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                                onMouseDown={(e) => handleMouseDown(e, 'left', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date))}
                              />
                              {/* Right resize handle */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                                onMouseDown={(e) => handleMouseDown(e, 'right', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date))}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-3 mt-3 border-t text-[10px] text-muted-foreground">
          <span className="font-medium">Phases:</span>
          {Object.entries(PHASE_COLORS).map(([key, colors]) => (
            <span key={key} className={cn("inline-flex items-center rounded px-1.5 py-0.5 font-mono font-semibold", colors.bg, colors.text)}>
              {key}
            </span>
          ))}
        </div>
      </CardContent>

      {showAddItem && <CreateORPModal open={showAddItem} onOpenChange={setShowAddItem} onSuccess={() => setShowAddItem(false)} />}
      {selectedDeliverable && (
        <ORPDeliverableModal
          open={!!selectedDeliverable}
          onOpenChange={(open) => !open && setSelectedDeliverable(null)}
          deliverable={selectedDeliverable}
          allDeliverables={deliverables}
          planId={planId}
        />
      )}
      <ORAActivityTaskSheet
        task={selectedOraActivity}
        open={!!selectedOraActivity}
        onOpenChange={(open) => !open && setSelectedOraActivity(null)}
      />
    </Card>
  );
};
