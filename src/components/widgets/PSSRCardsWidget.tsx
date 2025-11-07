import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  LayoutGrid, 
  TableIcon,
  Columns3,
  GripVertical,
  Rocket,
  Settings2
} from 'lucide-react';
import DraggablePSSRCard from '../DraggablePSSRCard';
import CompactPSSRCard from '../CompactPSSRCard';
import PSSRTableView from '../PSSRTableView';
import PSSRKanbanBoard from '../PSSRKanbanBoard';
import { toast } from 'sonner';

export type CardDensity = 'minimal' | 'comfortable' | 'detailed';
export type ViewMode = 'card' | 'table' | 'kanban' | 'compact';

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

interface PSSRCardsWidgetProps {
  pssrs: PSSR[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  cardDensity: CardDensity;
  onCardDensityChange: (density: CardDensity) => void;
  onViewDetails: (pssrId: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getTeamStatusColor: (teamStatus: string) => string;
  getRiskLevelColor: (riskLevel: string) => string;
  pinnedPSSRs: string[];
  onTogglePin: (pssrId: string) => void;
  onEdit?: (pssrId: string) => void;
  onDuplicate?: (pssrId: string) => void;
  onArchive?: (pssrId: string) => void;
  pssrOrder: string[];
  onPssrOrderChange: (order: string[]) => void;
  totalCount: number;
}

const PSSRCardsWidget: React.FC<PSSRCardsWidgetProps> = ({
  pssrs,
  viewMode,
  onViewModeChange,
  cardDensity,
  onCardDensityChange,
  onViewDetails,
  getPriorityColor,
  getStatusIcon,
  getTeamStatusColor,
  getRiskLevelColor,
  pinnedPSSRs,
  onTogglePin,
  onEdit,
  onDuplicate,
  onArchive,
  pssrOrder,
  onPssrOrderChange,
  totalCount,
}) => {
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = pssrOrder.indexOf(active.id as string);
    const newIndex = pssrOrder.indexOf(over.id as string);
    onPssrOrderChange(arrayMove(pssrOrder, oldIndex, newIndex));
  };

  const getDensityValue = () => {
    switch (cardDensity) {
      case 'minimal': return 0;
      case 'comfortable': return 50;
      case 'detailed': return 100;
    }
  };

  const handleDensityChange = (value: number[]) => {
    if (value[0] < 33) {
      onCardDensityChange('minimal');
    } else if (value[0] < 67) {
      onCardDensityChange('comfortable');
    } else {
      onCardDensityChange('detailed');
    }
  };

  const getGapClass = () => {
    switch (cardDensity) {
      case 'minimal': return 'space-y-1';
      case 'comfortable': return 'space-y-3';
      case 'detailed': return 'space-y-4';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="space-y-4 mb-4">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Reviews <Badge variant="secondary" className="text-xs">{pssrs.length}/{totalCount}</Badge>
          </h3>
          
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/30 border border-border/30">
            <button
              onClick={() => onViewModeChange('card')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'card' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('compact')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'compact' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Compact View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('kanban')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kanban View"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card Density Slider */}
        {(viewMode === 'card' || viewMode === 'compact') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Card Density
              </label>
              <span className="text-xs font-medium text-foreground capitalize">
                {cardDensity}
              </span>
            </div>
            <Slider
              value={[getDensityValue()]}
              onValueChange={handleDensityChange}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Minimal</span>
              <span>Comfortable</span>
              <span>Detailed</span>
            </div>
          </div>
        )}

        {/* Drag to reorder hint */}
        {pssrs.length > 0 && (viewMode === 'card' || viewMode === 'compact') && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
            <GripVertical className="h-3 w-3" />
            Drag to reorder
          </div>
        )}
      </div>

      {/* PSSR Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {viewMode === 'table' ? (
          <PSSRTableView 
            pssrs={pssrs}
            onViewDetails={onViewDetails}
          />
        ) : viewMode === 'kanban' ? (
          <PSSRKanbanBoard
            pssrs={pssrs}
            onViewDetails={onViewDetails}
            getPriorityColor={getPriorityColor}
            getStatusIcon={getStatusIcon}
            getTeamStatusColor={getTeamStatusColor}
            getRiskLevelColor={getRiskLevelColor}
            pinnedPSSRs={new Set(pinnedPSSRs)}
            onTogglePin={onTogglePin}
            onStatusChange={(pssrId, newStatus) => {
              toast.success(`PSSR ${pssrId} moved to ${newStatus}`);
            }}
          />
        ) : viewMode === 'compact' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pssrs.map(pssr => pssr.id)} strategy={verticalListSortingStrategy}>
              <div className={getGapClass()}>
                {pssrs.map((pssr) => (
                  <CompactPSSRCard
                    key={pssr.id}
                    pssr={pssr}
                    onViewDetails={onViewDetails}
                    getTeamStatusColor={getTeamStatusColor}
                    isPinned={pinnedPSSRs.includes(pssr.id)}
                    onTogglePin={onTogglePin}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragId ? (
                <Card className="p-5 shadow-2xl bg-background/95 backdrop-blur-md border-2 border-primary/50">
                  <div className="text-center">
                    <Rocket className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Moving PSSR...</p>
                    <p className="text-sm text-muted-foreground">
                      {pssrs.find(p => p.id === activeDragId)?.projectId}
                    </p>
                  </div>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pssrs.map(pssr => pssr.id)} strategy={verticalListSortingStrategy}>
              <div className={getGapClass()}>
                {pssrs.map((pssr, index) => (
                  <DraggablePSSRCard
                    key={pssr.id}
                    pssr={pssr}
                    index={index}
                    onViewDetails={onViewDetails}
                    getPriorityColor={getPriorityColor}
                    getStatusIcon={getStatusIcon}
                    getTeamStatusColor={getTeamStatusColor}
                    getRiskLevelColor={getRiskLevelColor}
                    isPinned={pinnedPSSRs.includes(pssr.id)}
                    onTogglePin={onTogglePin}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onArchive={onArchive}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDragId ? (
                <Card className="p-5 shadow-2xl bg-background/95 backdrop-blur-md border-2 border-primary/50">
                  <div className="text-center">
                    <Rocket className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground">Moving PSSR...</p>
                    <p className="text-sm text-muted-foreground">
                      {pssrs.find(p => p.id === activeDragId)?.projectId}
                    </p>
                  </div>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {pssrs.length === 0 && (
          <div className="text-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No PSSRs match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PSSRCardsWidget;
