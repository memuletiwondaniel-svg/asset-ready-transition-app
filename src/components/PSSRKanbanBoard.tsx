import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import PSSRKanbanCard from './pssr/PSSRKanbanCard';

interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  priority: string;
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  teamStatus: string;
  pendingApprovals: number;
  completedDate: string | null;
  riskLevel: string;
  nextReview: string | null;
  teamMembers: number;
  lastActivity: string;
  location: string;
  tier: 1 | 2 | 3;
}

interface PSSRKanbanBoardProps {
  pssrs: PSSR[];
  onViewDetails: (pssrId: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getTeamStatusColor: (teamStatus: string) => string;
  getRiskLevelColor: (riskLevel: string) => string;
  pinnedPSSRs: Set<string>;
  onTogglePin: (pssrId: string) => void;
  onStatusChange?: (pssrId: string, newStatus: string) => void;
}

const statusColumns = [
  { id: 'Draft', title: 'Draft', color: 'border-slate-500/40 bg-slate-50/30 dark:bg-slate-950/10' },
  { id: 'Under Review', title: 'Under Review', color: 'border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10' },
  { id: 'Completed', title: 'Completed', color: 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10' },
];

const PSSRKanbanBoard: React.FC<PSSRKanbanBoardProps> = ({
  pssrs,
  onViewDetails,
  pinnedPSSRs,
  onTogglePin,
  onStatusChange,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState(pssrs);

  React.useEffect(() => {
    setItems(pssrs);
  }, [pssrs]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activePSSR = items.find(p => p.id === activeId);
    const overPSSR = items.find(p => p.id === overId);

    if (!activePSSR || !overPSSR) return;

    if (activePSSR.status !== overPSSR.status) {
      setItems(items => {
        const updatedItems = items.map(item => 
          item.id === activeId 
            ? { ...item, status: overPSSR.status }
            : item
        );
        return updatedItems;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activePSSR = items.find(p => p.id === active.id);
      const overPSSR = items.find(p => p.id === over.id);

      if (activePSSR && overPSSR && activePSSR.status === overPSSR.status) {
        const status = activePSSR.status;
        const statusItems = items.filter(p => p.status === status);
        const oldIndex = statusItems.findIndex(p => p.id === active.id);
        const newIndex = statusItems.findIndex(p => p.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(statusItems, oldIndex, newIndex);
          const otherItems = items.filter(p => p.status !== status);
          setItems([...otherItems, ...reordered]);
        }
      } else if (activePSSR && overPSSR && onStatusChange) {
        onStatusChange(active.id as string, overPSSR.status);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setItems(pssrs);
  };

  const getPSSRsByStatus = (status: string) => {
    return items.filter(pssr => pssr.status === status);
  };

  const activePSSR = items.find(p => p.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-16rem)] min-h-[400px]">
        {statusColumns.map((column) => {
          const columnPSSRs = getPSSRsByStatus(column.id);
          
          return (
            <Card key={column.id} className={`flex flex-col border-2 ${column.color} min-h-0`}>
              <CardHeader className="flex-shrink-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {column.title}
                  </CardTitle>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    {columnPSSRs.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 pt-0 pb-2 px-2">
                <ScrollArea className="h-full">
                  <SortableContext
                    items={columnPSSRs.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 pr-2 pb-2">
                      {columnPSSRs.map((pssr) => (
                        <PSSRKanbanCard
                          key={pssr.id}
                          pssr={pssr}
                          onViewDetails={onViewDetails}
                          isPinned={pinnedPSSRs.has(pssr.id)}
                          onTogglePin={onTogglePin}
                        />
                      ))}
                      {columnPSSRs.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                          No items
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DragOverlay>
        {activeId && activePSSR ? (
          <div className="opacity-90 rotate-2 scale-105">
            <PSSRKanbanCard
              pssr={activePSSR}
              onViewDetails={onViewDetails}
              isPinned={pinnedPSSRs.has(activePSSR.id)}
              onTogglePin={onTogglePin}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PSSRKanbanBoard;
