import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2ASystem } from '../hooks/useP2ASystems';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getVCRColor } from '../utils/vcrColors';

interface SystemCardProps {
  system: P2ASystem;
  onClick?: () => void;
  compact?: boolean;
  isDragging?: boolean;
}

// For HC systems: completion means RFSU, for non-HC: completion means RFO
const getCompletionStatus = (system: P2ASystem) => {
  return system.is_hydrocarbon ? 'RFSU' : 'RFO';
};

const isComplete = (system: P2ASystem) => {
  const targetStatus = getCompletionStatus(system);
  return system.completion_status === targetStatus;
};

export const SystemCard: React.FC<SystemCardProps> = ({
  system,
  onClick,
  compact = false,
  isDragging = false,
}) => {
  // Get VCR color if system is assigned to a VCR
  const vcrColor = getVCRColor(system.assigned_vcr_code);
  
  // Card styling - use VCR color if assigned, otherwise default styling
  const cardStyle = vcrColor ? {
    backgroundColor: vcrColor.background,
    borderColor: vcrColor.border,
  } : undefined;

  const defaultClasses = !vcrColor ? (
    isComplete(system) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'
  ) : '';

  // When dragging, hide the original card completely (DragOverlay shows the preview)
  if (isDragging) {
    return (
      <Card className="w-[140px] border border-dashed border-muted-foreground/30 bg-muted/20 opacity-40">
        <CardContent className="p-1.5">
          <div className="h-[34px]" /> {/* Placeholder to maintain layout */}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-sm w-[140px] border',
        defaultClasses
      )}
      style={cardStyle}
      onClick={onClick}
    >
      <CardContent className="p-1.5">
        <div className="flex items-start gap-1.5 relative">
          {/* HC Indicator - only show flame icon for hydrocarbon systems */}
          {system.is_hydrocarbon && (
            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 bg-orange-500/10 text-orange-500">
              <Flame className="w-2.5 h-2.5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* System Name */}
            <span className="text-[10px] font-medium truncate block leading-tight">
              {system.name}
            </span>

            {/* System ID + Progress */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] text-muted-foreground font-mono truncate">
                {system.system_id}
              </span>
              <span className={cn(
                'text-[8px] font-medium shrink-0',
                isComplete(system) ? 'text-emerald-500' : 'text-muted-foreground'
              )}>
                {system.completion_percentage}%
              </span>
            </div>
          </div>

          {/* Drag Handle - absolute positioned, shown on hover */}
          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Draggable version of SystemCard for drag-and-drop
export const DraggableSystemCard: React.FC<SystemCardProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `system-${props.system.id}`,
    data: {
      type: 'system',
      system: props.system,
    },
  });

  // Don't apply transform when isDragging — DragOverlay handles the visual preview
  const style = (transform && !isDragging) ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-system-id={props.system.id} data-assigned-vcr-id={props.system.assigned_handover_point_id || undefined}>
      <SystemCard {...props} isDragging={isDragging} />
    </div>
  );
};