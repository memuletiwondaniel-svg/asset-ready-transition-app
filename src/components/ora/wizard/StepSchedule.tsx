import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ZoomIn, ZoomOut, GripVertical } from 'lucide-react';
import { WizardActivity } from './types';
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  activities: WizardActivity[];
  onActivitiesChange: (activities: WizardActivity[]) => void;
}

const DAY_WIDTH_BASE = 28;
const MIN_BAR_WIDTH = 8;
const ACTIVITY_COL_WIDTH = 280;

const PHASE_COLORS: Record<string, string> = {
  IDN: 'bg-blue-400 dark:bg-blue-500',
  ASS: 'bg-amber-400 dark:bg-amber-500',
  SEL: 'bg-emerald-400 dark:bg-emerald-500',
  DEF: 'bg-teal-400 dark:bg-teal-500',
  EXE: 'bg-rose-400 dark:bg-rose-500',
  OPR: 'bg-purple-400 dark:bg-purple-500',
};

function getBarColor(code: string): string {
  const prefix = code.split('-')[0];
  return PHASE_COLORS[prefix] || 'bg-primary';
}

export const StepSchedule: React.FC<Props> = ({ activities, onActivitiesChange }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  const selectedActivities = useMemo(() => activities.filter(a => a.selected), [activities]);

  const updateActivity = useCallback((id: string, updates: Partial<WizardActivity>) => {
    onActivitiesChange(activities.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...updates };
      // Auto-calculate end date from start date + duration
      if ((updates.startDate || updates.durationDays) && updated.startDate && updated.durationDays) {
        try {
          const start = parseISO(updated.startDate);
          const end = addDays(start, updated.durationDays);
          updated.endDate = format(end, 'yyyy-MM-dd');
        } catch {}
      }
      // Auto-calculate duration from start and end dates
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

  // Timeline range calculations
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const datesWithValues = selectedActivities.filter(a => a.startDate);
    if (datesWithValues.length === 0) {
      const today = startOfDay(new Date());
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 90),
        totalDays: 90,
      };
    }

    let minDate = parseISO(datesWithValues[0].startDate);
    let maxDate = parseISO(datesWithValues[0].startDate);

    datesWithValues.forEach(a => {
      const start = parseISO(a.startDate);
      if (start < minDate) minDate = start;
      const end = a.endDate ? parseISO(a.endDate) : addDays(start, a.durationDays || 30);
      if (end > maxDate) maxDate = end;
    });

    // Add padding
    const padStart = addDays(minDate, -7);
    const padEnd = addDays(maxDate, 14);
    const days = Math.max(differenceInDays(padEnd, padStart), 60);

    return { timelineStart: padStart, timelineEnd: padEnd, totalDays: days };
  }, [selectedActivities]);

  const dayWidth = DAY_WIDTH_BASE * zoomLevel;
  const timelineWidth = totalDays * dayWidth;

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers: { label: string; left: number }[] = [];
    let current = new Date(timelineStart);
    current.setDate(1);
    if (current < timelineStart) current.setMonth(current.getMonth() + 1);

    while (current <= timelineEnd) {
      const dayOffset = differenceInDays(current, timelineStart);
      markers.push({
        label: format(current, 'MMM yyyy'),
        left: dayOffset * dayWidth,
      });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [timelineStart, timelineEnd, dayWidth]);

  // Generate week markers
  const weekMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let i = 0; i < totalDays; i += 7) {
      markers.push(i * dayWidth);
    }
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
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-3 p-1">
      <div className="text-center space-y-2 pb-1">
        <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Schedule & Timeline</h3>
        <p className="text-xs text-muted-foreground">Set start dates and durations. End dates auto-calculate.</p>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))} disabled={zoomLevel <= 0.5}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground font-mono w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))} disabled={zoomLevel >= 3}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Gantt chart container */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <div className="flex">
          {/* Activity column header */}
          <div className="shrink-0 border-r bg-muted/30" style={{ width: ACTIVITY_COL_WIDTH }}>
            <div className="h-10 px-3 flex items-center border-b">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity</span>
            </div>
          </div>

          {/* Timeline header */}
          <div className="flex-1 overflow-x-auto" ref={timelineRef}>
            <div style={{ width: timelineWidth, minWidth: '100%' }}>
              {/* Month markers */}
              <div className="h-10 relative border-b bg-muted/20">
                {monthMarkers.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center px-2 border-l border-border/40"
                    style={{ left: m.left }}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity rows */}
        <div className="max-h-[340px] overflow-y-auto">
          {selectedActivities.map((activity, index) => {
            const barPos = getBarPosition(activity);

            return (
              <div key={activity.id} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors group">
                {/* Activity info */}
                <div className="shrink-0 border-r" style={{ width: ACTIVITY_COL_WIDTH }}>
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono shrink-0">
                        {activity.activityCode}
                      </Badge>
                      <span className="text-xs font-medium truncate flex-1">{activity.activity}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <Input
                          type="date"
                          value={activity.startDate}
                          onChange={(e) => updateActivity(activity.id, { startDate: e.target.value })}
                          className="h-6 text-[10px] px-1.5"
                          placeholder="Start"
                        />
                      </div>
                      <div className="w-12">
                        <Input
                          type="number"
                          min={1}
                          value={activity.durationDays ?? ''}
                          onChange={(e) => updateActivity(activity.id, { durationDays: parseInt(e.target.value) || null })}
                          className="h-6 text-[10px] px-1.5 text-center"
                          placeholder="Days"
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                        {activity.endDate ? format(parseISO(activity.endDate), 'dd MMM') : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="flex-1 overflow-hidden">
                  <div
                    className="relative"
                    style={{ width: timelineWidth, minWidth: '100%', height: '100%', minHeight: 52 }}
                  >
                    {/* Week grid lines */}
                    {weekMarkers.map((left, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-border/20"
                        style={{ left }}
                      />
                    ))}

                    {/* Bar */}
                    {barPos && (
                      <div
                        className={cn(
                          "absolute top-3 h-7 rounded-md shadow-sm transition-all",
                          getBarColor(activity.activityCode),
                          "opacity-80 hover:opacity-100 cursor-default"
                        )}
                        style={{
                          left: barPos.left,
                          width: barPos.width,
                        }}
                        title={`${activity.activity}: ${activity.startDate} → ${activity.endDate || '?'} (${activity.durationDays || '?'}d)`}
                      >
                        <div className="px-1.5 h-full flex items-center overflow-hidden">
                          <span className="text-[9px] text-white font-medium truncate">
                            {activity.durationDays}d
                          </span>
                        </div>
                      </div>
                    )}

                    {/* No-date placeholder */}
                    {!barPos && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/50 italic">Set start date →</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {selectedActivities.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No activities selected. Go back to Step 3 to select activities.
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{selectedActivities.filter(a => a.startDate).length} of {selectedActivities.length} scheduled</span>
        <span>{totalDays} day timeline span</span>
      </div>
    </div>
  );
};
