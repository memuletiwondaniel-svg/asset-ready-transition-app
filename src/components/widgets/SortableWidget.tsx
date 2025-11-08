import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  id: string;
  children: (props: { attributes: any; listeners: any }) => React.ReactNode;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="lg:col-span-1 min-h-0">
      {children({ attributes, listeners })}
    </div>
  );
};
