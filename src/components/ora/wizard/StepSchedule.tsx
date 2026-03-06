import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, ZoomIn, ZoomOut, ChevronRight, ChevronDown, Columns3, ChevronsUpDown, GitBranch, Trash2, Plus, Library, PenLine, X, Link2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { WizardActivity, catalogToWizardActivity } from './types';
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';
import { AddFromCatalogDialog } from './AddFromCatalogDialog';
import { cn } from '@/lib/utils';
import { useGanttBarResize } from '@/hooks/useGanttBarResize';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DrillDownCalendar } from '@/components/ui/drill-down-calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Props {
  activities: WizardActivity[];
  onActivitiesChange: (activities: WizardActivity[]) => void;
}

const DAY_WIDTH_BASE = 28;
const MIN_BAR_WIDTH = 8;
const ROW_HEIGHT = 40;

const COL_DEFS = {
  id: { key: 'id' as const, label: 'ID', width: 90, alwaysVisible: true },
  name: { key: 'name' as const, label: 'Activity', width: 280, alwaysVisible: true },
  start: { key: 'start' as const, label: 'Start', width: 100, alwaysVisible: false },
  end: { key: 'end' as const, label: 'End', width: 80, alwaysVisible: false },
  duration: { key: 'duration' as const, label: 'Days', width: 56, alwaysVisible: false },
  status: { key: 'status' as const, label: 'Status', width: 100, alwaysVisible: false },
};

type ColKey = keyof typeof COL_DEFS;
const ALL_COLS: ColKey[] = ['id', 'name', 'start', 'end', 'duration', 'status'];
const DEFAULT_VISIBLE: ColKey[] = ['id', 'name', 'start'];

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  IDN: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  ASS: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  SEL: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  DEF: { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400' },
  EXE: { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400' },
  OPR: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
};

const BAR_COLORS: Record<string, string> = {
  IDN: 'bg-blue-400 dark:bg-blue-500',
  ASS: 'bg-amber-400 dark:bg-amber-500',
  SEL: 'bg-emerald-400 dark:bg-emerald-500',
  DEF: 'bg-teal-400 dark:bg-teal-500',
  EXE: 'bg-indigo-400 dark:bg-indigo-500',
  OPR: 'bg-purple-400 dark:bg-purple-500',
};

const BAR_COLORS_MUTED: Record<string, string> = {
  IDN: 'bg-blue-200 dark:bg-blue-800',
  ASS: 'bg-amber-200 dark:bg-amber-800',
  SEL: 'bg-emerald-200 dark:bg-emerald-800',
  DEF: 'bg-teal-200 dark:bg-teal-800',
  EXE: 'bg-indigo-200 dark:bg-indigo-800',
  OPR: 'bg-purple-200 dark:bg-purple-800',
};

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started', class: 'bg-muted text-muted-foreground' },
  { value: 'IN_PROGRESS', label: 'In Progress', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  { value: 'COMPLETED', label: 'Completed', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
];

const ZOOM_PRESETS = [
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
  { label: '24M', days: 730 },
];

function getPhasePrefix(code: string): string {
  return code.split('-')[0];
}
function getBarColor(code: string): string {
  return BAR_COLORS[getPhasePrefix(code)] || 'bg-primary';
}
function getIdBadgeClasses(code: string) {
  const prefix = getPhasePrefix(code);
  return PHASE_COLORS[prefix] || { bg: 'bg-muted', text: 'text-foreground' };
}

// Hierarchy helpers
function buildChildrenMap(activities: WizardActivity[]): Map<string | null, WizardActivity[]> {
  const map = new Map<string | null, WizardActivity[]>();
  activities.forEach(a => {
    const parentId = a.parentActivityId || null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(a);
  });
  return map;
}

function getDepth(activity: WizardActivity, activities: WizardActivity[]): number {
  let depth = 0;
  let current = activity;
  while (current.parentActivityId) {
    depth++;
    const parent = activities.find(a => a.id === current.parentActivityId);
    if (!parent) break;
    current = parent;
  }
  return depth;
}

interface FlatRow {
  activity: WizardActivity;
  depth: number;
  hasChildren: boolean;
}

function buildVisibleRows(
  activities: WizardActivity[],
  childrenMap: Map<string | null, WizardActivity[]>,
  expandedIds: Set<string>,
  parentId: string | null = null,
  depth: number = 0
): FlatRow[] {
  const children = childrenMap.get(parentId) || [];
  const rows: FlatRow[] = [];
  for (const child of children) {
    const hasChildren = (childrenMap.get(child.id) || []).length > 0;
    rows.push({ activity: child, depth, hasChildren });
    if (hasChildren && expandedIds.has(child.id)) {
      rows.push(...buildVisibleRows(activities, childrenMap, expandedIds, child.id, depth + 1));
    }
  }
  return rows;
}

// Get aggregated date range for parent from all descendants
function getParentDateRange(
  activityId: string,
  activities: WizardActivity[],
  childrenMap: Map<string | null, WizardActivity[]>
): { minStart: string | null; maxEnd: string | null } {
  const children = childrenMap.get(activityId) || [];
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const child of children) {
    if (child.startDate) {
      const s = parseISO(child.startDate);
      if (!minStart || s < minStart) minStart = s;
    }
    if (child.endDate) {
      const e = parseISO(child.endDate);
      if (!maxEnd || e > maxEnd) maxEnd = e;
    }
    // Recurse
    const sub = getParentDateRange(child.id, activities, childrenMap);
    if (sub.minStart) {
      const s = parseISO(sub.minStart);
      if (!minStart || s < minStart) minStart = s;
    }
    if (sub.maxEnd) {
      const e = parseISO(sub.maxEnd);
      if (!maxEnd || e > maxEnd) maxEnd = e;
    }
  }

  return {
    minStart: minStart ? format(minStart, 'yyyy-MM-dd') : null,
    maxEnd: maxEnd ? format(maxEnd, 'yyyy-MM-dd') : null,
  };
}

// Predecessor picker sub-component
const PredecessorPicker: React.FC<{
  activities: WizardActivity[];
  currentId: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
}> = ({ activities, currentId, selectedIds, onToggle }) => {
  const [search, setSearch] = useState('');
  const available = activities.filter(a =>
    a.id !== currentId &&
    a.activity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col max-h-[280px]">
      <div className="p-2 border-b">
        <Input
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="overflow-y-auto p-1 space-y-0.5">
        {available.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No activities found</p>
        )}
        {available.map(a => {
          const isSelected = selectedIds.includes(a.id);
          const colors = getIdBadgeClasses(a.activityCode);
          return (
            <button
              key={a.id}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50 border border-transparent"
              )}
              onClick={() => onToggle(a.id)}
            >
              <span className={cn("text-[9px] font-mono font-semibold rounded px-1 py-0.5 whitespace-nowrap shrink-0", colors.bg, colors.text)}>
                {a.activityCode}
              </span>
              <span className="text-[11px] truncate flex-1">{a.activity}</span>
              {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const StepSchedule: React.FC<Props> = ({ activities, onActivitiesChange }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [showRelationships, setShowRelationships] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState<{ description: string; startDate: string; endDate: string; durationDays: number | null; status: string } | null>(null);
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedActivities = useMemo(() => activities.filter(a => a.selected), [activities]);

  const childrenMap = useMemo(() => buildChildrenMap(selectedActivities), [selectedActivities]);

  // Default expand: show top-level parents expanded so activities are visible
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const roots = (childrenMap.get(null) || []).filter(a => (childrenMap.get(a.id) || []).length > 0);
    return new Set(roots.map(a => a.id));
  });

  const visibleRows = useMemo(
    () => buildVisibleRows(selectedActivities, childrenMap, expandedIds),
    [selectedActivities, childrenMap, expandedIds]
  );

  const selectedActivity = useMemo(
    () => selectedActivityId ? activities.find(a => a.id === selectedActivityId) : null,
    [selectedActivityId, activities]
  );

  const isDirty = useMemo(() => {
    if (!selectedActivity || !originalSnapshot) return false;
    return (
      (selectedActivity.description || '') !== originalSnapshot.description ||
      (selectedActivity.startDate || '') !== originalSnapshot.startDate ||
      (selectedActivity.endDate || '') !== originalSnapshot.endDate ||
      (selectedActivity.durationDays ?? null) !== originalSnapshot.durationDays ||
      ((selectedActivity as any).status || 'NOT_STARTED') !== originalSnapshot.status
    );
  }, [selectedActivity, originalSnapshot]);

  const openActivitySheet = useCallback((id: string) => {
    const act = activities.find(a => a.id === id);
    if (act) {
      setOriginalSnapshot({
        description: act.description || '',
        startDate: act.startDate || '',
        endDate: act.endDate || '',
        durationDays: act.durationDays ?? null,
        status: (act as any).status || 'NOT_STARTED',
      });
    }
    setSelectedActivityId(id);
  }, [activities]);

  const leftPanelWidth = useMemo(() => {
    return ALL_COLS.filter(k => visibleCols.has(k)).reduce((sum, k) => sum + COL_DEFS[k].width, 0);
  }, [visibleCols]);

  const toggleCol = (col: ColKey) => {
    if (COL_DEFS[col].alwaysVisible) return;
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = new Set<string>();
    selectedActivities.forEach(a => {
      if ((childrenMap.get(a.id) || []).length > 0) allParentIds.add(a.id);
    });
    setExpandedIds(allParentIds);
  };

  const collapseAll = () => setExpandedIds(new Set());

  const handleAddFromCatalog = (newActivities: WizardActivity[]) => {
    onActivitiesChange([...activities, ...newActivities]);
    setShowCatalogDialog(false);
  };

  const handleAddCustom = () => {
    const customActivity: WizardActivity = {
      id: `custom-${Date.now()}`,
      activityCode: `CUSTOM-${Date.now()}`,
      activity: 'New Custom Activity',
      description: null,
      phaseId: null,
      parentActivityId: null,
      durationHigh: null,
      durationMed: null,
      durationLow: null,
      selected: true,
      durationDays: null,
      startDate: '',
      endDate: '',
      predecessorIds: [],
    };
    onActivitiesChange([...activities, customActivity]);
    // Open the sheet immediately so user can edit details
    setTimeout(() => openActivitySheet(customActivity.id), 50);
  };

  const updateActivity = useCallback((id: string, updates: Partial<WizardActivity & { status?: string }>) => {
    onActivitiesChange(activities.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...updates };
      if ((updates.startDate || updates.durationDays) && updated.startDate && updated.durationDays) {
        try {
          const start = parseISO(updated.startDate);
          const end = addDays(start, updated.durationDays);
          updated.endDate = format(end, 'yyyy-MM-dd');
        } catch {}
      }
      if (updates.endDate && updated.startDate && updated.endDate && !updates.durationDays) {
        try {
          const start = parseISO(updated.startDate);
          const end = parseISO(updated.endDate);
          const diff = differenceInDays(end, start);
          if (diff > 0) updated.durationDays = diff;
        } catch {}
      }
      return updated;
    }));
  }, [activities, onActivitiesChange]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const datesWithValues = selectedActivities.filter(a => a.startDate);
    if (datesWithValues.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: today, timelineEnd: addDays(today, 90), totalDays: 90 };
    }
    let minDate = parseISO(datesWithValues[0].startDate);
    let maxDate = parseISO(datesWithValues[0].startDate);
    datesWithValues.forEach(a => {
      const start = parseISO(a.startDate);
      if (start < minDate) minDate = start;
      const end = a.endDate ? parseISO(a.endDate) : addDays(start, a.durationDays || 30);
      if (end > maxDate) maxDate = end;
    });
    const padStart = addDays(minDate, -7);
    const padEnd = addDays(maxDate, 14);
    const days = Math.max(differenceInDays(padEnd, padStart), 60);
    return { timelineStart: padStart, timelineEnd: padEnd, totalDays: days };
  }, [selectedActivities]);

  const dayWidth = DAY_WIDTH_BASE * zoomLevel;
  const timelineWidth = totalDays * dayWidth;

  const handleBarResize = useCallback((activityId: string, newStart: Date, newEnd: Date) => {
    const startStr = format(newStart, 'yyyy-MM-dd');
    const endStr = format(newEnd, 'yyyy-MM-dd');
    const durationDays = differenceInDays(newEnd, newStart);
    updateActivity(activityId, { startDate: startStr, endDate: endStr, durationDays });
  }, [updateActivity]);

  const { draggingId, previewLeft, previewWidth, handleMouseDown } = useGanttBarResize({
    minDate: timelineStart,
    dayWidth,
    onResize: handleBarResize,
  });

  const monthMarkers = useMemo(() => {
    const markers: { label: string; left: number }[] = [];
    let current = new Date(timelineStart);
    current.setDate(1);
    if (current < timelineStart) current.setMonth(current.getMonth() + 1);
    while (current <= timelineEnd) {
      const dayOffset = differenceInDays(current, timelineStart);
      markers.push({ label: format(current, 'MMM yyyy'), left: dayOffset * dayWidth });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [timelineStart, timelineEnd, dayWidth]);

  const weekMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let i = 0; i < totalDays; i += 7) markers.push(i * dayWidth);
    return markers;
  }, [totalDays, dayWidth]);

  const getBarPosition = (startDate: string, endDateOrDuration: string | number) => {
    try {
      const start = parseISO(startDate);
      const left = differenceInDays(start, timelineStart) * dayWidth;
      let width: number;
      if (typeof endDateOrDuration === 'string') {
        const end = parseISO(endDateOrDuration);
        width = Math.max(differenceInDays(end, start) * dayWidth, MIN_BAR_WIDTH);
      } else {
        width = Math.max((endDateOrDuration || 14) * dayWidth, MIN_BAR_WIDTH);
      }
      return { left, width };
    } catch { return null; }
  };

  const setZoomToFitDays = (targetDays: number) => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const newZoom = containerWidth / (targetDays * DAY_WIDTH_BASE);
    setZoomLevel(Math.max(0.1, Math.min(4, newZoom)));
  };

  const handleDateSelect = (activityId: string, date: Date | undefined) => {
    if (date) updateActivity(activityId, { startDate: format(date, 'yyyy-MM-dd') });
  };

  const isColVisible = (col: ColKey) => visibleCols.has(col);

  return (
    <div className="space-y-3 p-1">
      <div className="text-center space-y-2 pb-1">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Schedule & Timeline</h3>
        <p className="text-xs text-muted-foreground">Click dates to pick from calendar. Click activity rows for details.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {ZOOM_PRESETS.map(p => (
            <Button key={p.label} variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium" onClick={() => setZoomToFitDays(p.days)}>
              {p.label}
            </Button>
          ))}
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium gap-1" onClick={expandAll}>
            <ChevronsUpDown className="w-3 h-3" /> Expand
          </Button>
          <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium" onClick={collapseAll}>
            Collapse
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant={showRelationships ? 'secondary' : 'outline'}
            size="sm"
            className="h-6 px-2 text-[10px] font-medium gap-1"
            onClick={() => setShowRelationships(!showRelationships)}
          >
            <GitBranch className="w-3 h-3" />
            Relations
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium gap-1 border-primary/30 text-primary hover:bg-primary/10">
                <Plus className="w-3 h-3" /> Add Activity
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => setShowCatalogDialog(true)} className="text-xs gap-2">
                <Library className="w-3.5 h-3.5" /> From Catalog
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={false} onCheckedChange={handleAddCustom} className="text-xs gap-2">
                <PenLine className="w-3.5 h-3.5" /> Custom Activity
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] gap-1">
                <Columns3 className="w-3 h-3" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {ALL_COLS.filter(k => !COL_DEFS[k].alwaysVisible).map(col => (
                <DropdownMenuCheckboxItem key={col} checked={visibleCols.has(col)} onCheckedChange={() => toggleCol(col)} className="text-xs">
                  {COL_DEFS[col].label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoomLevel(z => Math.max(0.1, z - 0.15))} disabled={zoomLevel <= 0.1}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground font-mono w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoomLevel(z => Math.min(4, z + 0.15))} disabled={zoomLevel >= 4}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="flex">
          <div className="shrink-0 border-r bg-muted/30" style={{ width: leftPanelWidth }}>
            <div className="flex items-center h-9 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {isColVisible('id') && <div className="px-2 border-r border-border/40" style={{ width: COL_DEFS.id.width }}>ID</div>}
              {isColVisible('name') && <div className="px-1.5 border-r border-border/40" style={{ width: COL_DEFS.name.width }}>Activity</div>}
              {isColVisible('start') && <div className="px-1 text-center" style={{ width: COL_DEFS.start.width }}>Start</div>}
              {isColVisible('end') && <div className="px-1 text-center" style={{ width: COL_DEFS.end.width }}>End</div>}
              {isColVisible('duration') && <div className="px-1 text-center" style={{ width: COL_DEFS.duration.width }}>Days</div>}
              {isColVisible('status') && <div className="px-1 text-center" style={{ width: COL_DEFS.status.width }}>Status</div>}
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

        {/* Rows */}
        <div className="max-h-[380px] overflow-y-auto" ref={scrollContainerRef}>
          <div className="flex">
            <div className="shrink-0 border-r" style={{ width: leftPanelWidth }}>
              {visibleRows.map((row, index) => {
                const { activity, depth, hasChildren } = row;
                const idColors = getIdBadgeClasses(activity.activityCode);
                const status = (activity as any).status || 'NOT_STARTED';
                const isExpanded = expandedIds.has(activity.id);
                const isParent = hasChildren;

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-center border-b last:border-b-0 transition-colors cursor-pointer hover:bg-accent/50",
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                      isParent && 'font-medium'
                    )}
                    style={{ minHeight: ROW_HEIGHT }}
                    onClick={() => openActivitySheet(activity.id)}
                  >
                    {isColVisible('id') && (
                      <div className="px-1.5 flex items-center justify-center border-r border-border/40" style={{ width: COL_DEFS.id.width }}>
                        <span className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap",
                          idColors.bg, idColors.text
                        )}>
                          {activity.activityCode}
                        </span>
                      </div>
                    )}

                    {isColVisible('name') && (
                      <div className="px-1.5 overflow-hidden flex items-center gap-0.5 border-r border-border/40" style={{ width: COL_DEFS.name.width }}>
                        <div style={{ paddingLeft: depth * 16 }} className="flex items-center gap-1 min-w-0">
                          {hasChildren ? (
                            <button
                              className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-accent/50"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(activity.id); }}
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
                          )} title={activity.activity}>
                            {activity.activity}
                          </span>
                        </div>
                      </div>
                    )}

                    {isColVisible('start') && (
                      <div className="px-0.5" style={{ width: COL_DEFS.start.width }} onClick={e => e.stopPropagation()}>
                        {!isParent ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={cn(
                                "w-full h-6 rounded border border-dashed border-border/50 text-[10px] px-1.5 text-left hover:bg-accent/30 transition-colors",
                                activity.startDate ? 'text-foreground' : 'text-muted-foreground/50'
                              )}>
                                {activity.startDate ? format(parseISO(activity.startDate), 'dd MMM yy') : 'Set date'}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start" side="bottom">
                              <Calendar
                                mode="single"
                                selected={activity.startDate ? parseISO(activity.startDate) : undefined}
                                onSelect={(date) => handleDateSelect(activity.id, date)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 px-1.5">—</span>
                        )}
                      </div>
                    )}

                    {isColVisible('end') && (
                      <div className="px-0.5 flex items-center justify-center" style={{ width: COL_DEFS.end.width }}>
                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                          {activity.endDate ? format(parseISO(activity.endDate), 'dd MMM') : '—'}
                        </span>
                      </div>
                    )}

                    {isColVisible('duration') && (
                      <div className="px-0.5" style={{ width: COL_DEFS.duration.width }} onClick={e => e.stopPropagation()}>
                        {!isParent ? (
                          <Input
                            type="number" min={1}
                            value={activity.durationDays ?? ''}
                            onChange={(e) => updateActivity(activity.id, { durationDays: parseInt(e.target.value) || null })}
                            className="h-6 text-[10px] px-1 text-center border-dashed"
                            placeholder="—"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 px-1 block text-center">—</span>
                        )}
                      </div>
                    )}

                    {isColVisible('status') && (
                      <div className="px-0.5" style={{ width: COL_DEFS.status.width }} onClick={e => e.stopPropagation()}>
                        <Select value={status} onValueChange={(v) => updateActivity(activity.id, { status: v } as any)}>
                          <SelectTrigger className="h-6 text-[9px] px-1.5 border-dashed [&>svg]:w-3 [&>svg]:h-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleRows.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No activities selected. Go back to Step 3.
                </div>
              )}
            </div>

            {/* Timeline rows */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: timelineWidth, minWidth: '100%' }}>
                {visibleRows.map((row, index) => {
                  const { activity, hasChildren } = row;
                  const isParent = hasChildren;

                  // For parents, show summary bar spanning children
                  let barPos: { left: number; width: number } | null = null;
                  if (isParent) {
                    const range = getParentDateRange(activity.id, selectedActivities, childrenMap);
                    if (range.minStart && range.maxEnd) {
                      barPos = getBarPosition(range.minStart, range.maxEnd);
                    }
                  } else if (activity.startDate) {
                    barPos = getBarPosition(activity.startDate, activity.durationDays || 14);
                  }

                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        "relative border-b last:border-b-0",
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      )}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {weekMarkers.map((left, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-border/15" style={{ left }} />
                      ))}
                      {barPos && isParent && (() => {
                        const prefix = getPhasePrefix(activity.activityCode);
                        const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                        const barColorSolid = getBarColor(activity.activityCode);

                        return (
                          <div
                            className={cn(
                              "absolute top-2 rounded shadow-sm overflow-hidden",
                              mutedColor,
                            )}
                            style={{ left: barPos.left, width: barPos.width, height: ROW_HEIGHT - 16 }}
                            title={`${activity.activity} (summary)`}
                          >
                            <div className={cn("h-full rounded", barColorSolid, "opacity-50")} style={{ width: '100%' }} />
                            {barPos.width > 24 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                                {(() => {
                                  const range = getParentDateRange(activity.id, selectedActivities, childrenMap);
                                  if (range.minStart && range.maxEnd) {
                                    return `${differenceInDays(parseISO(range.maxEnd), parseISO(range.minStart))}d`;
                                  }
                                  return '';
                                })()}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {barPos && !isParent && (() => {
                        const isDragging = draggingId === activity.id;
                        const barL = isDragging && previewLeft !== null ? previewLeft : barPos.left;
                        const barW = isDragging && previewWidth !== null ? previewWidth : barPos.width;
                        const prefix = getPhasePrefix(activity.activityCode);
                        const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                        const barColorSolid = getBarColor(activity.activityCode);
                        const completion = (activity as any).completionPercentage || 0;

                        return (
                          <div
                            className={cn(
                              "absolute top-2 rounded shadow-sm overflow-hidden transition-all group",
                              mutedColor,
                              isDragging && "ring-2 ring-primary/50 shadow-lg"
                            )}
                            style={{ left: barL, width: barW, height: ROW_HEIGHT - 16 }}
                            title={`${activity.activity}: ${activity.startDate} → ${activity.endDate || '?'} (${activity.durationDays || '?'}d)`}
                          >
                            {/* Progress fill */}
                            <div
                              className={cn("absolute h-full rounded-l", barColorSolid)}
                              style={{ width: `${completion}%` }}
                            />
                            {/* Label */}
                            <div className="absolute inset-0 flex items-center px-1.5 z-10">
                              <span className="text-[9px] text-white font-medium truncate drop-shadow-sm">{activity.durationDays}d</span>
                            </div>
                            {/* Left resize handle */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                              onMouseDown={(e) => {
                                if (!activity.startDate || !activity.endDate) return;
                                handleMouseDown(e, 'left', activity.id, barPos.left, barPos.width, parseISO(activity.startDate), parseISO(activity.endDate));
                              }}
                            />
                            {/* Right resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                              onMouseDown={(e) => {
                                if (!activity.startDate) return;
                                const endDate = activity.endDate ? parseISO(activity.endDate) : addDays(parseISO(activity.startDate), activity.durationDays || 14);
                                handleMouseDown(e, 'right', activity.id, barPos.left, barPos.width, parseISO(activity.startDate), endDate);
                              }}
                            />
                          </div>
                        );
                      })()}
                      {!barPos && !isParent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/40 italic">Set start date →</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{selectedActivities.filter(a => a.startDate).length} of {selectedActivities.length} scheduled</span>
        <span>{totalDays} day timeline span</span>
      </div>

      {/* Activity Detail Sheet */}
      <Sheet open={!!selectedActivityId} onOpenChange={(open) => { if (!open) setSelectedActivityId(null); }}>
        <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
          {selectedActivity && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center rounded px-2 py-1 text-xs font-mono font-semibold whitespace-nowrap",
                    getIdBadgeClasses(selectedActivity.activityCode).bg,
                    getIdBadgeClasses(selectedActivity.activityCode).text
                  )}>
                    {selectedActivity.activityCode}
                  </span>
                </div>
                <SheetTitle className="text-sm">{selectedActivity.activity}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5 pt-4">
                {/* Editable Description */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Description</label>
                  <Textarea
                    placeholder="Add a description for this activity..."
                    value={selectedActivity.description || ''}
                    onChange={(e) => updateActivity(selectedActivity.id, { description: e.target.value })}
                    className="mt-1.5 min-h-[140px] resize-none text-sm border-primary/30 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Schedule</label>
                  <div className="space-y-3 mt-1.5">
                    {/* Date summary row */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex-1 rounded-md border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Start</div>
                        <div className={cn("font-medium", selectedActivity.startDate ? "text-foreground" : "text-muted-foreground/50")}>
                          {selectedActivity.startDate ? format(parseISO(selectedActivity.startDate), 'dd MMM yyyy') : '—'}
                        </div>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex-1 rounded-md border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">End</div>
                        <div className={cn("font-medium", selectedActivity.endDate ? "text-foreground" : "text-muted-foreground/50")}>
                          {selectedActivity.endDate ? format(parseISO(selectedActivity.endDate), 'dd MMM yyyy') : '—'}
                        </div>
                      </div>
                      <div className="w-16 rounded-md border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Days</div>
                        <div className="font-medium">{selectedActivity.durationDays ?? '—'}</div>
                      </div>
                    </div>

                    {/* Inline range calendar */}
                    <div className="text-[10px] text-muted-foreground text-center">
                      {!selectedActivity.startDate 
                        ? 'Click a date to set start' 
                        : !selectedActivity.endDate 
                          ? 'Click another date to set end' 
                          : 'Click to change start date, then end date'}
                    </div>
                    <div className="border rounded-lg flex justify-center">
                      <DrillDownCalendar
                        mode="range"
                        selected={
                          selectedActivity.startDate
                            ? {
                                from: parseISO(selectedActivity.startDate),
                                to: selectedActivity.endDate ? parseISO(selectedActivity.endDate) : undefined,
                              }
                            : undefined
                        }
                        onSelect={(range) => {
                          if (!range) return;
                          const updates: Partial<WizardActivity> = {};
                          if (range.from) {
                            updates.startDate = format(range.from, 'yyyy-MM-dd');
                          }
                          if (range.from && range.to) {
                            updates.endDate = format(range.to, 'yyyy-MM-dd');
                            updates.durationDays = differenceInDays(range.to, range.from);
                          } else if (range.from && !range.to && selectedActivity.durationDays) {
                            const computedEnd = addDays(range.from, selectedActivity.durationDays);
                            updates.endDate = format(computedEnd, 'yyyy-MM-dd');
                          }
                          updateActivity(selectedActivity.id, updates);
                        }}
                        numberOfMonths={1}
                        initialFocus
                        className="scale-[0.88] origin-top"
                      />
                    </div>

                    {/* Duration manual input */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Duration (days)</span>
                      <Input
                        type="number" min={1}
                        value={selectedActivity.durationDays ?? ''}
                        onChange={(e) => updateActivity(selectedActivity.id, { durationDays: parseInt(e.target.value) || null })}
                        className="h-7 w-20 text-xs text-center"
                        placeholder="—"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Select
                        value={(selectedActivity as any).status || 'NOT_STARTED'}
                        onValueChange={(v) => updateActivity(selectedActivity.id, { status: v } as any)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Prerequisites / Relationships */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
                    <Link2 className="w-3 h-3" /> Prerequisites
                  </label>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">
                    Select activities that must complete before this one can start.
                  </p>

                  {/* Current predecessors */}
                  {selectedActivity.predecessorIds.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {selectedActivity.predecessorIds.map(predId => {
                        const pred = activities.find(a => a.id === predId);
                        if (!pred) return null;
                        const predColors = getIdBadgeClasses(pred.activityCode);
                        return (
                          <div key={predId} className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 group">
                            <span className={cn("text-[9px] font-mono font-semibold rounded px-1 py-0.5 whitespace-nowrap", predColors.bg, predColors.text)}>
                              {pred.activityCode}
                            </span>
                            <span className="text-xs text-foreground/80 truncate flex-1">{pred.activity}</span>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                              onClick={() => {
                                updateActivity(selectedActivity.id, {
                                  predecessorIds: selectedActivity.predecessorIds.filter(id => id !== predId)
                                });
                              }}
                            >
                              <X className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add predecessor popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 w-full border-dashed">
                        <Plus className="w-3 h-3" /> Add Predecessor
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start" side="bottom">
                      <PredecessorPicker
                        activities={selectedActivities}
                        currentId={selectedActivity.id}
                        selectedIds={selectedActivity.predecessorIds}
                        onToggle={(predId) => {
                          const current = selectedActivity.predecessorIds;
                          const updated = current.includes(predId)
                            ? current.filter(id => id !== predId)
                            : [...current, predId];
                          updateActivity(selectedActivity.id, { predecessorIds: updated });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Footer: Delete (left) + Smart Save (right) */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{selectedActivity.activity}" from the plan. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onActivitiesChange(activities.filter(a => a.id !== selectedActivity.id));
                            setSelectedActivityId(null);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className={cn(
                    "transition-all duration-200",
                    isDirty ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
                  )}>
                    <Button
                      size="sm"
                      onClick={() => {
                        setOriginalSnapshot({
                          description: selectedActivity.description || '',
                          startDate: selectedActivity.startDate || '',
                          endDate: selectedActivity.endDate || '',
                          durationDays: selectedActivity.durationDays ?? null,
                          status: (selectedActivity as any).status || 'NOT_STARTED',
                        });
                        setSelectedActivityId(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add from Catalog Dialog */}
      <AddFromCatalogDialog
        open={showCatalogDialog}
        onOpenChange={setShowCatalogDialog}
        existingIds={activities.map(a => a.id)}
        onAdd={handleAddFromCatalog}
      />
    </div>
  );
};
