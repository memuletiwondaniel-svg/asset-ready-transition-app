import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  id: string;
  children: (props: { attributes: any; listeners: any }) => React.ReactNode;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`min-h-0 relative transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : ''
      } ${isOver && !isDragging ? 'ring-2 ring-primary/30 rounded-xl' : ''}`}
    >
      {/* Drop zone indicator */}
      {isOver && !isDragging && (
        <div className="absolute inset-0 -z-10 bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl animate-pulse" />
      )}
      {children({ attributes, listeners })}
    </div>
  );
};
