import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ORPDeliverableModal } from './ORPDeliverableModal';

interface ORPKanbanBoardProps {
  planId: string;
  deliverables: any[];
}

export const ORPKanbanBoard: React.FC<ORPKanbanBoardProps> = ({ planId, deliverables }) => {
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  
  const columns = [
    { id: 'NOT_STARTED', label: 'Not Started', color: 'slate' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'blue' },
    { id: 'COMPLETED', label: 'Completed', color: 'green' },
    { id: 'ON_HOLD', label: 'On Hold', color: 'amber' }
  ];

  const getColumnDeliverables = (status: string) => {
    return deliverables.filter(d => d.status === status);
  };

  return (
    <div className="h-full p-6">
      <div className="grid grid-cols-4 gap-4 h-full">
        {columns.map((column) => {
          const items = getColumnDeliverables(column.id);
          
          return (
            <Card key={column.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{column.label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden pt-0">
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-4">
                    {items.map((item) => (
                      <Card
                        key={item.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedDeliverable(item)}
                      >
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {item.deliverable?.name}
                        </h4>
                        
                        {item.estimated_manhours && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.estimated_manhours} hrs</span>
                          </div>
                        )}

                        {item.start_date && item.end_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {format(new Date(item.start_date), 'MMM dd')} - {format(new Date(item.end_date), 'MMM dd')}
                            </span>
                          </div>
                        )}

                        {item.completion_percentage > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{item.completion_percentage}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${item.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}

                    {items.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No items
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedDeliverable && (
        <ORPDeliverableModal
          open={!!selectedDeliverable}
          onOpenChange={(open) => !open && setSelectedDeliverable(null)}
          deliverable={selectedDeliverable}
          allDeliverables={deliverables}
          planId={planId}
        />
      )}
    </div>
  );
};
