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
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import DraggablePSSRCard from './DraggablePSSRCard';

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
  { id: 'Pending', title: 'Pending', color: 'border-orange-500/40 bg-orange-50/30 dark:bg-orange-950/10' },
  { id: 'In Progress', title: 'In Progress', color: 'border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/10' },
  { id: 'Under Review', title: 'Under Review', color: 'border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10' },
  { id: 'Approved', title: 'Approved', color: 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10' },
];

const PSSRKanbanBoard: React.FC<PSSRKanbanBoardProps> = ({
  pssrs,
  onViewDetails,
  getPriorityColor,
  getStatusIcon,
  getTeamStatusColor,
  getRiskLevelColor,
  pinnedPSSRs,
  onTogglePin,
  onStatusChange,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const overStatus = statusColumns.find(col => 
        pssrs.find(p => p.id === over.id)?.status === col.id
      )?.id || over.id as string;

      if (onStatusChange && statusColumns.some(col => col.id === overStatus)) {
        onStatusChange(active.id as string, overStatus);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const getPSSRsByStatus = (status: string) => {
    return pssrs.filter(pssr => pssr.status === status);
  };

  const activePSSR = pssrs.find(p => p.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-20rem)]">
        {statusColumns.map((column) => {
          const columnPSSRs = getPSSRsByStatus(column.id);
          
          return (
            <Card key={column.id} className={`flex flex-col border-2 ${column.color}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {column.title}
                  </CardTitle>
                  <Badge variant="secondary" className="font-semibold">
                    {columnPSSRs.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-0 pb-2 px-2">
                <ScrollArea className="h-full pr-2">
                  <SortableContext
                    items={columnPSSRs.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 pb-2">
                      {columnPSSRs.map((pssr, index) => (
                        <div key={pssr.id} className="px-2">
                          <DraggablePSSRCard
                            pssr={pssr}
                            index={index}
                            onViewDetails={onViewDetails}
                            getPriorityColor={getPriorityColor}
                            getStatusIcon={getStatusIcon}
                            getTeamStatusColor={getTeamStatusColor}
                            getRiskLevelColor={getRiskLevelColor}
                            isPinned={pinnedPSSRs.has(pssr.id)}
                            onTogglePin={onTogglePin}
                          />
                        </div>
                      ))}
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
          <div className="opacity-80 rotate-3 scale-105">
            <DraggablePSSRCard
              pssr={activePSSR}
              index={0}
              onViewDetails={onViewDetails}
              getPriorityColor={getPriorityColor}
              getStatusIcon={getStatusIcon}
              getTeamStatusColor={getTeamStatusColor}
              getRiskLevelColor={getRiskLevelColor}
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
