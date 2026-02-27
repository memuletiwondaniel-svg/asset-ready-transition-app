import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, ZoomIn, ZoomOut, ChevronDown, Columns3, X } from 'lucide-react';
import { WizardActivity } from './types';
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
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
  name: { key: 'name' as const, label: 'Activity', width: 180, alwaysVisible: true },
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

export const StepSchedule: React.FC<Props> = ({ activities, onActivitiesChange }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedActivities = useMemo(() => activities.filter(a => a.selected), [activities]);
  const selectedActivity = useMemo(
    () => selectedActivityId ? activities.find(a => a.id === selectedActivityId) : null,
    [selectedActivityId, activities]
  );

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

  const getBarPosition = (activity: WizardActivity) => {
    if (!activity.startDate) return null;
    try {
      const start = parseISO(activity.startDate);
      const duration = activity.durationDays || 14;
      const left = differenceInDays(start, timelineStart) * dayWidth;
      const width = Math.max(duration * dayWidth, MIN_BAR_WIDTH);
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
    if (date) {
      updateActivity(activityId, { startDate: format(date, 'yyyy-MM-dd') });
    }
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
        </div>
        <div className="flex items-center gap-2">
          {/* Column toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] gap-1">
                <Columns3 className="w-3 h-3" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {ALL_COLS.filter(k => !COL_DEFS[k].alwaysVisible).map(col => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleCols.has(col)}
                  onCheckedChange={() => toggleCol(col)}
                  className="text-xs"
                >
                  {COL_DEFS[col].label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom */}
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
          {/* Left panel header */}
          <div className="shrink-0 border-r bg-muted/30" style={{ width: leftPanelWidth }}>
            <div className="flex items-center h-9 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {isColVisible('id') && <div className="px-2" style={{ width: COL_DEFS.id.width }}>ID</div>}
              {isColVisible('name') && <div className="px-1 truncate" style={{ width: COL_DEFS.name.width }}>Activity</div>}
              {isColVisible('start') && <div className="px-1 text-center" style={{ width: COL_DEFS.start.width }}>Start</div>}
              {isColVisible('end') && <div className="px-1 text-center" style={{ width: COL_DEFS.end.width }}>End</div>}
              {isColVisible('duration') && <div className="px-1 text-center" style={{ width: COL_DEFS.duration.width }}>Days</div>}
              {isColVisible('status') && <div className="px-1 text-center" style={{ width: COL_DEFS.status.width }}>Status</div>}
            </div>
          </div>

          {/* Timeline header */}
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
        <div className="max-h-[380px] overflow-y-auto" ref={scrollContainerRef}>
          <div className="flex">
            {/* Left panel rows */}
            <div className="shrink-0 border-r" style={{ width: leftPanelWidth }}>
              {selectedActivities.map((activity, index) => {
                const idColors = getIdBadgeClasses(activity.activityCode);
                const status = (activity as any).status || 'NOT_STARTED';

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex items-center border-b last:border-b-0 transition-colors cursor-pointer hover:bg-accent/50",
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    )}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => setSelectedActivityId(activity.id)}
                  >
                    {/* Activity ID badge */}
                    {isColVisible('id') && (
                      <div className="px-1.5 flex items-center justify-center" style={{ width: COL_DEFS.id.width }}>
                        <span className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap",
                          idColors.bg, idColors.text
                        )}>
                          {activity.activityCode}
                        </span>
                      </div>
                    )}

                    {/* Activity Name */}
                    {isColVisible('name') && (
                      <div className="px-1 overflow-hidden" style={{ width: COL_DEFS.name.width }}>
                        <span className="text-[11px] font-medium truncate block" title={activity.activity}>
                          {activity.activity}
                        </span>
                      </div>
                    )}

                    {/* Start Date - Calendar Popover */}
                    {isColVisible('start') && (
                      <div className="px-0.5" style={{ width: COL_DEFS.start.width }} onClick={e => e.stopPropagation()}>
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
                      </div>
                    )}

                    {/* End Date (read-only) */}
                    {isColVisible('end') && (
                      <div className="px-0.5 flex items-center justify-center" style={{ width: COL_DEFS.end.width }}>
                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                          {activity.endDate ? format(parseISO(activity.endDate), 'dd MMM') : '—'}
                        </span>
                      </div>
                    )}

                    {/* Duration */}
                    {isColVisible('duration') && (
                      <div className="px-0.5" style={{ width: COL_DEFS.duration.width }} onClick={e => e.stopPropagation()}>
                        <Input
                          type="number"
                          min={1}
                          value={activity.durationDays ?? ''}
                          onChange={(e) => updateActivity(activity.id, { durationDays: parseInt(e.target.value) || null })}
                          className="h-6 text-[10px] px-1 text-center border-dashed"
                          placeholder="—"
                        />
                      </div>
                    )}

                    {/* Status */}
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

              {selectedActivities.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No activities selected. Go back to Step 3.
                </div>
              )}
            </div>

            {/* Timeline rows */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: timelineWidth, minWidth: '100%' }}>
                {selectedActivities.map((activity, index) => {
                  const barPos = getBarPosition(activity);
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
                      {barPos && (
                        <div
                          className={cn(
                            "absolute top-2 rounded shadow-sm transition-all",
                            getBarColor(activity.activityCode),
                            "opacity-85 hover:opacity-100"
                          )}
                          style={{ left: barPos.left, width: barPos.width, height: ROW_HEIGHT - 16 }}
                          title={`${activity.activity}: ${activity.startDate} → ${activity.endDate || '?'} (${activity.durationDays || '?'}d)`}
                        >
                          <div className="px-1.5 h-full flex items-center overflow-hidden">
                            <span className="text-[9px] text-white font-medium truncate">{activity.durationDays}d</span>
                          </div>
                        </div>
                      )}
                      {!barPos && (
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
                {/* Description */}
                {selectedActivity.description && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Description</label>
                    <p className="text-sm text-foreground mt-1">{selectedActivity.description}</p>
                  </div>
                )}

                {/* Duration Estimates */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Duration Estimates (days)</label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    <div className="rounded-md border p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">Low</div>
                      <div className="text-sm font-semibold">{selectedActivity.durationLow ?? '—'}</div>
                    </div>
                    <div className="rounded-md border p-2 text-center bg-primary/5">
                      <div className="text-[10px] text-muted-foreground">Med</div>
                      <div className="text-sm font-semibold">{selectedActivity.durationMed ?? '—'}</div>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">High</div>
                      <div className="text-sm font-semibold">{selectedActivity.durationHigh ?? '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Schedule fields */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Schedule</label>
                  <div className="space-y-3 mt-1.5">
                    {/* Start Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Start Date</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-7 text-xs px-3", !selectedActivity.startDate && "text-muted-foreground")}>
                            {selectedActivity.startDate ? format(parseISO(selectedActivity.startDate), 'dd MMM yyyy') : 'Pick date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedActivity.startDate ? parseISO(selectedActivity.startDate) : undefined}
                            onSelect={(date) => { if (date) updateActivity(selectedActivity.id, { startDate: format(date, 'yyyy-MM-dd') }); }}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">End Date</span>
                      <span className="text-xs font-medium">
                        {selectedActivity.endDate ? format(parseISO(selectedActivity.endDate), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Duration (days)</span>
                      <Input
                        type="number"
                        min={1}
                        value={selectedActivity.durationDays ?? ''}
                        onChange={(e) => updateActivity(selectedActivity.id, { durationDays: parseInt(e.target.value) || null })}
                        className="h-7 w-20 text-xs text-center"
                        placeholder="—"
                      />
                    </div>

                    {/* Status */}
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
