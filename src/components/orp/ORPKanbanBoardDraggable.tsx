import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ORPDeliverableModal } from './ORPDeliverableModal';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ORPKanbanBoardProps {
  planId: string;
  deliverables: any[];
}

interface DeliverableCardProps {
  item: any;
  onClick: () => void;
}

const DeliverableCard: React.FC<DeliverableCardProps> = ({ item, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={onClick}
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
  );
};

export const ORPKanbanBoardDraggable: React.FC<ORPKanbanBoardProps> = ({ planId, deliverables }) => {
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { updateDeliverable } = useORPPlans();
  const { toast } = useToast();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = [
    { id: 'NOT_STARTED', label: 'Not Started', color: 'slate' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'blue' },
    { id: 'COMPLETED', label: 'Completed', color: 'green' },
    { id: 'ON_HOLD', label: 'On Hold', color: 'amber' }
  ];

  const getColumnDeliverables = (status: string) => {
    return deliverables.filter(d => d.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = over.id as string;
    const activeDeliverable = deliverables.find(d => d.id === active.id);
    
    // Check if dropped on a column
    const targetColumn = columns.find(col => col.id === overId);
    
    if (targetColumn && activeDeliverable && activeDeliverable.status !== targetColumn.id) {
      updateDeliverable({
        deliverableId: activeDeliverable.id,
        status: targetColumn.id as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
      });
      
      toast({
        title: 'Status Updated',
        description: `Moved to ${targetColumn.label}`
      });
    }
  };

  const activeDeliverable = activeId ? deliverables.find(d => d.id === activeId) : null;

  const DroppableColumn = ({ column, items }: { column: any; items: any[] }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });

    return (
      <Card 
        ref={setNodeRef}
        className={cn(
          "flex flex-col transition-all",
          isOver && "ring-2 ring-primary bg-primary/5"
        )}
      >
        <CardHeader className="pb-3 p-3 md:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center justify-between">
            <span>{column.label}</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              {items.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden pt-0 p-2 md:p-6">
          <ScrollArea className="h-full">
            <div className="space-y-2 md:space-y-3 pr-2 md:pr-4 min-h-[200px]">
              {items.map((item) => (
                <DeliverableCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedDeliverable(item)}
                />
              ))}

              {items.length === 0 && (
                <div className={cn(
                  "text-center py-6 md:py-8 text-muted-foreground text-xs sm:text-sm rounded-lg border-2 border-dashed transition-all",
                  isOver && "border-primary bg-primary/5"
                )}>
                  {isOver ? 'Drop here' : 'Drop items here'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 h-full">
          {columns.map((column) => {
            const items = getColumnDeliverables(column.id);
            
            return (
              <SortableContext
                key={column.id}
                id={column.id}
                items={items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn column={column} items={items} />
              </SortableContext>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeDeliverable ? (
          <Card className="p-3 opacity-90 shadow-lg">
            <h4 className="font-medium text-sm">
              {activeDeliverable.deliverable?.name}
            </h4>
          </Card>
        ) : null}
      </DragOverlay>

      {selectedDeliverable && (
        <ORPDeliverableModal
          open={!!selectedDeliverable}
          onOpenChange={(open) => !open && setSelectedDeliverable(null)}
          deliverable={selectedDeliverable}
          allDeliverables={deliverables}
          planId={planId}
        />
      )}
    </DndContext>
  );
};
