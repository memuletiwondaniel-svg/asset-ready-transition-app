import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, Pin, PinOff } from 'lucide-react';

interface TaskData {
  id: number;
  title: { [key: string]: string };
  description: { [key: string]: string };
  age: string;
  criticality: string;
  type: string;
  icon: any;
}

interface DraggableTaskListProps {
  task: TaskData;
  index: number;
  selectedLanguage: string;
  isPinned: boolean;
  onTogglePin: (taskId: number) => void;
}

const DraggableTaskList: React.FC<DraggableTaskListProps> = ({
  task,
  index,
  selectedLanguage,
  isPinned,
  onTogglePin
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = task.icon;
  
  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' };
      case 'high': return { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' };
      case 'medium': return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
    }
  };

  const criticalityStyle = getCriticalityColor(task.criticality);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-300 ${
        isDragging ? 'opacity-50 scale-[1.02] z-50 shadow-lg' : ''
      }`}
    >
      <div
        className={`group relative bg-white/90 backdrop-blur-sm border ${
          isPinned ? 'border-warning/50 bg-warning/5' : 'border-gray-200/50'
        } rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in-up ${
          isDragging ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`}
        style={{ 
          animationDelay: `${index * 0.02}s`,
        }}
      >
        <div className="flex items-center px-4 py-3 gap-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/20 rounded-md transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors duration-200" />
          </div>

          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors duration-200">
                {task.title[selectedLanguage] || task.title.English}
              </h3>
              {/* Priority indicator */}
              <div className={`w-2 h-2 rounded-full ${criticalityStyle.dot}`} />
            </div>
            <p className="text-xs text-gray-600 line-clamp-1 mb-2">
              {task.description[selectedLanguage] || task.description.English}
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{task.age}</span>
              </div>
              <div className={`px-2 py-0.5 rounded-md font-medium ${criticalityStyle.bg} ${criticalityStyle.text}`}>
                {task.criticality}
              </div>
            </div>
          </div>

          {/* Pin/Unpin Button */}
          <div className="flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(task.id);
              }}
              className="p-2 hover:bg-muted/20 rounded-lg transition-colors duration-200 group/pin"
            >
              {isPinned ? (
                <PinOff className="h-4 w-4 text-warning hover:text-warning/70 transition-colors duration-200" />
              ) : (
                <Pin className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors duration-200" />
              )}
            </button>
          </div>
        </div>

        {/* Drag Indicator when dragging */}
        {isDragging && (
          <div className="absolute -top-0.5 -left-0.5 -right-0.5 -bottom-0.5 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5" />
        )}
      </div>
    </div>
  );
};

export default DraggableTaskList;