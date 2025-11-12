import React from 'react';
import { Card } from '@/components/ui/card';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ORPGanttChartProps {
  deliverables: any[];
}

export const ORPGanttChart: React.FC<ORPGanttChartProps> = ({ deliverables }) => {
  // Calculate date range
  const dates = deliverables
    .filter(d => d.start_date && d.end_date)
    .flatMap(d => [parseISO(d.start_date), parseISO(d.end_date)]);

  if (!dates.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p>No timeline data available</p>
          <p className="text-sm mt-2">Add start and end dates to deliverables to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  const getBarPosition = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const left = (differenceInDays(start, minDate) / totalDays) * 100;
    const width = (differenceInDays(end, start) / totalDays) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'ON_HOLD':
        return 'bg-amber-500';
      default:
        return 'bg-slate-300';
    }
  };

  // Generate month markers
  const monthMarkers: Date[] = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    monthMarkers.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return (
    <div className="space-y-4">
      {/* Timeline header */}
      <div className="sticky top-0 bg-background z-10 border-b pb-2">
        <div className="flex">
          <div className="w-64 flex-shrink-0 font-semibold px-4">Activity</div>
          <div className="flex-1 relative h-12">
            {monthMarkers.map((date, idx) => {
              const pos = (differenceInDays(date, minDate) / totalDays) * 100;
              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 border-l border-border"
                  style={{ left: `${pos}%` }}
                >
                  <span className="absolute -top-1 left-2 text-xs font-medium whitespace-nowrap">
                    {format(date, 'MMM yyyy')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gantt rows */}
      <div className="space-y-2">
        {deliverables
          .filter(d => d.start_date && d.end_date)
          .map((deliverable) => {
            const position = getBarPosition(deliverable.start_date, deliverable.end_date);
            return (
              <div key={deliverable.id} className="flex items-center group hover:bg-muted/50 rounded py-2">
                <div className="w-64 flex-shrink-0 px-4">
                  <div className="text-sm font-medium line-clamp-2">
                    {deliverable.deliverable?.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {deliverable.status.replace('_', ' ')}
                    </Badge>
                    {deliverable.estimated_manhours && (
                      <span className="text-xs text-muted-foreground">
                        {deliverable.estimated_manhours}h
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative h-10 px-2">
                  <div
                    className={`absolute h-6 rounded ${getStatusColor(deliverable.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer group-hover:shadow-md`}
                    style={position}
                  >
                    <div className="h-full relative">
                      {deliverable.completion_percentage > 0 && (
                        <div
                          className="absolute h-full bg-green-600 rounded-l"
                          style={{ width: `${deliverable.completion_percentage}%` }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white drop-shadow">
                          {deliverable.completion_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dependencies lines */}
                  {deliverable.dependencies?.map((dep: any) => {
                    const predecessor = deliverables.find(d => d.id === dep.predecessor_id);
                    if (!predecessor?.end_date) return null;
                    return (
                      <div
                        key={dep.id}
                        className="absolute h-px bg-primary/50"
                        style={{
                          left: getBarPosition(predecessor.end_date, predecessor.end_date).left,
                          width: '20px',
                          top: '50%'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-300 rounded" />
          <span className="text-xs">Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span className="text-xs">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span className="text-xs">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded" />
          <span className="text-xs">On Hold</span>
        </div>
      </div>
    </div>
  );
};
