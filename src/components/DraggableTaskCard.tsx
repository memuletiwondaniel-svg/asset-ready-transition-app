import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, ArrowRight, Pin, PinOff } from 'lucide-react';

interface TaskData {
  id: number;
  title: { [key: string]: string };
  description: { [key: string]: string };
  age: string;
  criticality: string;
  type: string;
  icon: any;
}

interface DraggableTaskCardProps {
  task: TaskData;
  index: number;
  selectedLanguage: string;
  isPinned: boolean;
  onTogglePin: (taskId: number) => void;
  viewDetailsText: string;
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({
  task,
  index,
  selectedLanguage,
  isPinned,
  onTogglePin,
  viewDetailsText
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = task.icon;
  
  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return { bg: 'bg-red-50/80', text: 'text-red-800', dot: 'bg-red-500', glow: 'shadow-red-100' };
      case 'high': return { bg: 'bg-orange-50/80', text: 'text-orange-800', dot: 'bg-orange-500', glow: 'shadow-orange-100' };
      case 'medium': return { bg: 'bg-blue-50/80', text: 'text-blue-800', dot: 'bg-blue-500', glow: 'shadow-blue-100' };
      default: return { bg: 'bg-gray-50/80', text: 'text-gray-800', dot: 'bg-gray-400', glow: 'shadow-gray-100' };
    }
  };

  const criticalityStyle = getCriticalityColor(task.criticality);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-300 ${
        isDragging 
          ? 'opacity-50 scale-105 z-50 shadow-2xl' 
          : isOver 
            ? 'scale-102' 
            : ''
      }`}
    >
      <div
        className={`group relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-md border ${
          isPinned ? 'border-warning/50 bg-warning/5' : 'border-gray-200/50'
        } hover:border-primary/30 ${criticalityStyle.glow} hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-fade-in-up ${
          isDragging ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`}
        style={{ 
          animationDelay: `${index * 0.05}s`,
        }}
        tabIndex={0}
        role="button"
        aria-label={`View task: ${task.title}`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 cursor-grab active:cursor-grabbing p-1 hover:bg-muted/20 rounded-md transition-colors duration-200 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors duration-200" />
        </div>

        {/* Pin/Unpin Button */}
        <div className="absolute left-2 top-8 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(task.id);
            }}
            className="p-1 hover:bg-muted/20 rounded-md transition-colors duration-200 group/pin"
          >
            {isPinned ? (
              <PinOff className="h-3 w-3 text-warning hover:text-warning/70 transition-colors duration-200" />
            ) : (
              <Pin className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors duration-200" />
            )}
          </button>
        </div>

        {/* Fluent Material Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-gray-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Priority indicator */}
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${criticalityStyle.dot} animate-pulse-subtle`} />
        </div>
        
        <div className="relative p-3 pl-8">
          {/* Compact header */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <IconComponent className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors duration-200 line-clamp-1">
                {task.title[selectedLanguage] || task.title.English}
              </h3>
            </div>
          </div>

          {/* Compact description */}
          <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors duration-200">
            {task.description[selectedLanguage] || task.description.English}
          </p>

          {/* Compact footer */}
          <div className="flex items-center justify-between">
            {/* Age with icon */}
            <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100/60 backdrop-blur-sm">
              <Clock className="h-3 w-3 text-gray-500 mr-1" />
              <span className="text-xs font-medium text-gray-700">{task.age}</span>
            </div>
            
            {/* Priority badge */}
            <div className={`px-2 py-0.5 rounded-md text-xs font-medium ${criticalityStyle.bg} ${criticalityStyle.text} backdrop-blur-sm`}>
              {task.criticality}
            </div>
          </div>

          {/* Hover action overlay */}
          <div className="absolute inset-0 bg-primary/5 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center">
            <button className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-primary text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <span>{viewDetailsText}</span>
              <ArrowRight className="h-3 w-3 ml-1 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Modern focus ring */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-primary/0 group-focus:ring-primary/30 transition-all duration-200" />

        {/* Drag Indicator when dragging */}
        {isDragging && (
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5" />
        )}
      </div>
    </div>
  );
};

export default DraggableTaskCard;