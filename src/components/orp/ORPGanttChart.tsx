import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { CreateORPModal } from './CreateORPModal';
import { ORPDeliverableModal } from './ORPDeliverableModal';
import { getStatusLabel, getStatusBadgeClasses } from './utils/statusStyles';
import { cn } from '@/lib/utils';

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
  name: 170,
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
  EXE: { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400' },
  OPR: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
};

const BAR_COLORS: Record<string, string> = {
  IDN: 'bg-blue-400 dark:bg-blue-500',
  ASS: 'bg-amber-400 dark:bg-amber-500',
  SEL: 'bg-emerald-400 dark:bg-emerald-500',
  DEF: 'bg-teal-400 dark:bg-teal-500',
  EXE: 'bg-rose-400 dark:bg-rose-500',
  OPR: 'bg-purple-400 dark:bg-purple-500',
};

const ZOOM_PRESETS = [
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
  { label: '24M', days: 730 },
];

function getPhasePrefix(code: string): string {
  return (code || '').split('-')[0];
}

export const ORPGanttChart: React.FC<ORPGanttChartProps> = ({ planId, deliverables, searchQuery: externalSearchQuery, hideToolbar }) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const searchQuery = externalSearchQuery ?? internalSearchQuery;

  const filteredDeliverables = useMemo(() => {
    if (!searchQuery.trim()) return deliverables;
    const query = searchQuery.toLowerCase();
    return deliverables.filter(d =>
      d.deliverable?.name?.toLowerCase().includes(query) ||
      d.deliverable?.activity_code?.toLowerCase().includes(query)
    );
  }, [deliverables, searchQuery]);

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

  // Month markers
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

  // Week markers
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

  const activeDeliverables = filteredDeliverables.filter(d => d.start_date && d.end_date);

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
            {/* Zoom presets */}
            <div className="flex items-center gap-1 mr-1">
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
                <div className="px-1" style={{ width: COL_WIDTHS.id }}>ID</div>
                <div className="px-1 truncate" style={{ width: COL_WIDTHS.name }}>Activity</div>
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
                {activeDeliverables.map((deliverable, index) => {
                  const activityCode = deliverable.deliverable?.activity_code || '';
                  const prefix = getPhasePrefix(activityCode);
                  const idColors = PHASE_COLORS[prefix] || { bg: 'bg-muted', text: 'text-foreground' };
                  const durationDays = differenceInDays(parseISO(deliverable.end_date), parseISO(deliverable.start_date));

                  return (
                    <div
                      key={deliverable.id}
                      className={cn(
                        "flex items-center border-b last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors",
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      )}
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => setSelectedDeliverable(deliverable)}
                    >
                      <div className="px-1 text-center text-[10px] text-muted-foreground" style={{ width: COL_WIDTHS.index }}>
                        {index + 1}
                      </div>
                      <div className="px-1 flex items-center" style={{ width: COL_WIDTHS.id }}>
                        {activityCode ? (
                          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold whitespace-nowrap", idColors.bg, idColors.text)}>
                            {activityCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="px-1 overflow-hidden" style={{ width: COL_WIDTHS.name }}>
                        <span className="text-[11px] font-medium truncate block" title={deliverable.deliverable?.name}>
                          {deliverable.deliverable?.name}
                        </span>
                      </div>
                      <div className="px-1 text-center" style={{ width: COL_WIDTHS.start }}>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(deliverable.start_date), 'dd MMM')}</span>
                      </div>
                      <div className="px-1 text-center" style={{ width: COL_WIDTHS.end }}>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(deliverable.end_date), 'dd MMM')}</span>
                      </div>
                      <div className="px-1 text-center" style={{ width: COL_WIDTHS.duration }}>
                        <span className="text-[10px] font-medium">{durationDays}d</span>
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
                  {activeDeliverables.map((deliverable, index) => {
                    const pos = getBarPosition(deliverable.start_date, deliverable.end_date);
                    const activityCode = deliverable.deliverable?.activity_code || '';
                    const prefix = getPhasePrefix(activityCode);
                    const barColor = BAR_COLORS[prefix] || 'bg-primary';

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

                        <div
                          className={cn(
                            "absolute top-2 rounded shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all",
                            barColor, "opacity-85 hover:opacity-100"
                          )}
                          style={{ left: pos.left, width: pos.width, height: ROW_HEIGHT - 16 }}
                          onClick={() => setSelectedDeliverable(deliverable)}
                        >
                          {/* Progress fill */}
                          <div
                            className="absolute h-full bg-white/20 rounded-l"
                            style={{ width: `${deliverable.completion_percentage || 0}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] text-white font-medium drop-shadow-sm">
                              {deliverable.completion_percentage || 0}%
                            </span>
                          </div>
                        </div>
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
    </Card>
  );
};
