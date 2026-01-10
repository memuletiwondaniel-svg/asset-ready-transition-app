import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { CreateORPModal } from './CreateORPModal';
import { ORPDeliverableModal } from './ORPDeliverableModal';

interface ORPGanttChartProps {
  planId: string;
  deliverables: any[];
}

export const ORPGanttChart: React.FC<ORPGanttChartProps> = ({ planId, deliverables }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  // Filter deliverables based on search query
  const filteredDeliverables = useMemo(() => {
    if (!searchQuery.trim()) return deliverables;
    const query = searchQuery.toLowerCase();
    return deliverables.filter(d => 
      d.deliverable?.name?.toLowerCase().includes(query)
    );
  }, [deliverables, searchQuery]);
  // Calculate date range
  const dates = filteredDeliverables
    .filter(d => d.start_date && d.end_date)
    .flatMap(d => [parseISO(d.start_date), parseISO(d.end_date)]);

  if (!dates.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gantt Chart</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deliverables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowAddItem(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add ORA Item
              </Button>
            </div>
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
        {showAddItem && (
          <CreateORPModal
            open={showAddItem}
            onOpenChange={setShowAddItem}
            onSuccess={() => setShowAddItem(false)}
          />
        )}
      </Card>
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


  // Generate month markers
  const monthMarkers: Date[] = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    monthMarkers.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gantt Chart</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliverables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAddItem(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add ORA Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
            {filteredDeliverables
              .filter(d => d.start_date && d.end_date)
              .map((deliverable) => {
                const position = getBarPosition(deliverable.start_date, deliverable.end_date);
                return (
                  <div 
                    key={deliverable.id} 
                    className="flex items-center group hover:bg-muted/50 rounded py-2 cursor-pointer"
                    onClick={() => setSelectedDeliverable(deliverable)}
                  >
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
                      {/* Progress bar */}
                      <div
                        className="absolute h-6 rounded bg-slate-300 dark:bg-slate-500 overflow-hidden hover:shadow-md transition-all cursor-pointer group-hover:scale-y-110"
                        style={position}
                      >
                        {/* Green progress fill */}
                        <div
                          className="absolute h-full bg-green-500 rounded-l transition-all"
                          style={{ width: `${deliverable.completion_percentage || 0}%` }}
                        />
                        {/* Progress text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-white drop-shadow-sm">
                            {deliverable.completion_percentage || 0}%
                          </span>
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
          <div className="flex items-center gap-3 pt-4 border-t">
            <div className="w-16 h-4 bg-slate-300 dark:bg-slate-500 rounded overflow-hidden">
              <div className="w-1/2 h-full bg-green-500" />
            </div>
            <span className="text-xs text-muted-foreground">Progress (completed / remaining)</span>
          </div>
        </div>
      </CardContent>

      {showAddItem && (
        <CreateORPModal
          open={showAddItem}
          onOpenChange={setShowAddItem}
          onSuccess={() => setShowAddItem(false)}
        />
      )}

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
