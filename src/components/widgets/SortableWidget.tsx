import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  id: string;
  className?: string;
  children: (props: { attributes: any; listeners: any }) => React.ReactNode;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({ id, className, children }) => {
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
      } ${className ?? ''}`}
    >
      {children({ attributes, listeners })}
    </div>
  );
};
