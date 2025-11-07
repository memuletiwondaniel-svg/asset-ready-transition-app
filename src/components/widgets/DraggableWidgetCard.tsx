import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Maximize2, Minimize2, EyeOff } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableWidgetCardProps {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onHide: () => void;
  children: React.ReactNode;
  colSpan?: string;
}

export const DraggableWidgetCard: React.FC<DraggableWidgetCardProps> = ({
  id,
  title,
  isExpanded,
  onToggleExpand,
  onHide,
  children,
  colSpan = 'lg:col-span-1'
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isExpanded ? 'lg:col-span-full' : colSpan} group`}
    >
      <Card className="border-border/50 bg-card h-full">
        <CardContent className="p-5 relative">
          {/* Widget Controls - Only visible on hover */}
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted/50"
              onClick={onToggleExpand}
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted/50"
              onClick={onHide}
              title="Hide widget"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
            <Button
              {...attributes}
              {...listeners}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted/50 cursor-grab active:cursor-grabbing"
              title="Drag to reposition"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Widget Content */}
          {children}
        </CardContent>
      </Card>
    </div>
  );
};
