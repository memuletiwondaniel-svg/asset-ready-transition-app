import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, GripVertical } from 'lucide-react';
import { useWidgetConfigs, WidgetConfig } from '@/hooks/useWidgetConfigs';
import { TasksWidget } from './TasksWidget';
import { QuickStatsWidget } from './QuickStatsWidget';
import { RecentActivityWidget } from './RecentActivityWidget';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  widget: WidgetConfig;
  children: React.ReactNode;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ widget, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-3'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${sizeClasses[widget.size]} animate-smooth-in`}
    >
      <Card className="h-full border-border/40 backdrop-blur-xl bg-card/95 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
        >
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-primary/10"
          >
            <GripVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Settings Button */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-primary/10"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {children}
      </Card>
    </div>
  );
};

export const DashboardWidgets: React.FC = () => {
  const { widgets, loading, reorderWidgets } = useWidgetConfigs();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex(w => w.id === active.id);
      const newIndex = widgets.findIndex(w => w.id === over.id);
      const reordered = arrayMove(widgets, oldIndex, newIndex);
      reorderWidgets(reordered);
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    if (!widget.is_visible) return null;

    switch (widget.widget_type) {
      case 'tasks':
        return <TasksWidget settings={widget.settings} />;
      case 'quick-stats':
        return <QuickStatsWidget settings={widget.settings} />;
      case 'recent-activity':
        return <RecentActivityWidget settings={widget.settings} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6 p-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="h-64 animate-pulse bg-muted/20" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-6 p-6">
          {widgets.map(widget => (
            <SortableWidget key={widget.id} widget={widget}>
              {renderWidget(widget)}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
