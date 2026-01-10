import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ORPDeliverableModal } from './ORPDeliverableModal';
import { ORPBulkActionsToolbar } from './ORPBulkActionsToolbar';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateORPModal } from './CreateORPModal';

interface ORPKanbanBoardProps {
  planId: string;
  deliverables: any[];
  searchQuery?: string;
  hideToolbar?: boolean;
}

interface DeliverableCardProps {
  item: any;
  onClick: () => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}

const DeliverableCard: React.FC<DeliverableCardProps> = ({ item, onClick, isSelected, onSelect }) => {
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

  // Check for dependencies
  const hasDependencies = item.dependencies && item.dependencies.length > 0;
  const unmetDependencies = item.dependencies?.filter((dep: any) => dep.predecessor?.status !== 'COMPLETED');

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative",
        unmetDependencies && unmetDependencies.length > 0 && "border-amber-500 border-2",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onSelect(item.id, checked as boolean);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
        <div className="flex-1 ml-2" onClick={onClick}>
          {unmetDependencies && unmetDependencies.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 text-xs flex items-center justify-center w-5 h-5 font-bold z-10">
              🔒
            </div>
          )}

          <h4 className="font-medium text-sm mb-2 line-clamp-2">
            {item.deliverable?.name}
          </h4>

          {unmetDependencies && unmetDependencies.length > 0 && (
            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <span className="font-semibold">Blocked:</span>
              <span>{unmetDependencies.length} prerequisite(s)</span>
            </div>
          )}
      
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
                  className={cn(
                    "h-full transition-all",
                    item.status === 'COMPLETED' ? "bg-green-500" : "bg-primary"
                  )}
                  style={{ width: `${item.completion_percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export const ORPKanbanBoardDraggable: React.FC<ORPKanbanBoardProps> = ({ planId, deliverables, searchQuery: externalSearchQuery, hideToolbar }) => {
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const { updateDeliverable } = useORPPlans();
  const { toast } = useToast();
  
  // Use external search query if provided, otherwise use internal
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  
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

  // Filter deliverables based on search query
  const filteredDeliverables = useMemo(() => {
    if (!searchQuery.trim()) return deliverables;
    const query = searchQuery.toLowerCase();
    return deliverables.filter(d => 
      d.deliverable?.name?.toLowerCase().includes(query)
    );
  }, [deliverables, searchQuery]);

  const getColumnDeliverables = (status: string) => {
    return filteredDeliverables.filter(d => d.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Check if deliverable has unmet dependencies
  const hasBlockingDependencies = (deliverableId: string) => {
    const deps = deliverables.filter(d => 
      d.dependencies?.some((dep: any) => dep.predecessor_id === deliverableId)
    );
    return deps.some(d => d.status !== 'COMPLETED');
  };

  const getBlockingDependencies = (deliverableId: string) => {
    return deliverables.filter(d => 
      d.dependencies?.some((dep: any) => dep.deliverable_id === deliverableId && d.status !== 'COMPLETED')
    );
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
      // Check for blocking dependencies
      const blockingDeps = getBlockingDependencies(activeDeliverable.id);
      
      if (blockingDeps.length > 0 && targetColumn.id === 'IN_PROGRESS') {
        toast({
          title: '⚠️ Blocked by Dependencies',
          description: `Cannot start until ${blockingDeps.length} prerequisite(s) are completed`,
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      updateDeliverable({
        deliverableId: activeDeliverable.id,
        status: targetColumn.id as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
      });
      
      toast({
        title: '✅ Status Updated',
        description: `Moved to ${targetColumn.label}`,
      });
    }
  };

  const activeDeliverable = activeId ? deliverables.find(d => d.id === activeId) : null;

  const handleBulkStatusUpdate = (status: string) => {
    selectedDeliverables.forEach(id => {
      updateDeliverable({
        deliverableId: id,
        status: status as any
      });
    });
    setSelectedDeliverables([]);
    toast({
      title: 'Success',
      description: `Updated ${selectedDeliverables.length} deliverable(s)`
    });
  };

  const handleBulkResourceAssign = (userId: string) => {
    // This would require extending the updateDeliverable mutation
    toast({
      title: 'Info',
      description: 'Resource assignment requires individual deliverable updates'
    });
    setSelectedDeliverables([]);
  };

  const handleBulkDateSet = (startDate: string, endDate: string) => {
    // Note: Date updates would require separate API endpoint
    setSelectedDeliverables([]);
    toast({
      title: 'Info',
      description: 'Bulk date updates require individual deliverable edits'
    });
  };

  const getColumnHeaderStyle = (columnId: string) => {
    switch (columnId) {
      case 'NOT_STARTED':
        return 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'COMPLETED':
        return 'bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'ON_HOLD':
        return 'bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      default:
        return 'bg-muted';
    }
  };

  const getColumnBadgeStyle = (columnId: string) => {
    switch (columnId) {
      case 'NOT_STARTED':
        return 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300';
      case 'IN_PROGRESS':
        return 'bg-blue-200/80 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300';
      case 'COMPLETED':
        return 'bg-green-200/80 dark:bg-green-800/50 text-green-600 dark:text-green-300';
      case 'ON_HOLD':
        return 'bg-amber-200/80 dark:bg-amber-800/50 text-amber-600 dark:text-amber-300';
      default:
        return '';
    }
  };

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
        <CardHeader className={cn("pb-3 p-3 md:p-6 rounded-t-lg", getColumnHeaderStyle(column.id))}>
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center justify-between">
            <span>{column.label}</span>
            <Badge className={cn("ml-2 text-xs border-0", getColumnBadgeStyle(column.id))}>
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
                  isSelected={selectedDeliverables.includes(item.id)}
                  onSelect={(id, selected) => {
                    if (selected) {
                      setSelectedDeliverables(prev => [...prev, id]);
                    } else {
                      setSelectedDeliverables(prev => prev.filter(d => d !== id));
                    }
                  }}
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
        {/* Search and Add Item Toolbar - only shown when not controlled externally */}
        {!hideToolbar && (
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliverables..."
                value={internalSearchQuery}
                onChange={(e) => setInternalSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAddItem(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add ORA Item
            </Button>
          </div>
        )}

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

      {showAddItem && (
        <CreateORPModal
          open={showAddItem}
          onOpenChange={setShowAddItem}
          onSuccess={() => setShowAddItem(false)}
        />
      )}

      <ORPBulkActionsToolbar
        selectedCount={selectedDeliverables.length}
        onUpdateStatus={handleBulkStatusUpdate}
        onAssignResource={handleBulkResourceAssign}
        onSetDates={handleBulkDateSet}
        onClearSelection={() => setSelectedDeliverables([])}
      />
    </DndContext>
  );
};
