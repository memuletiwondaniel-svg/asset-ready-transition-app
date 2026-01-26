import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Layers, GripVertical, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

/**
 * Generates a unique, vibrant HSL-based color from a VCR code.
 * Uses the numeric portion of the VCR code to ensure distinct colors.
 * Avoids red, amber, and green to prevent confusion with status indicators.
 */
const getVCRColor = (vcrCode: string | undefined) => {
  const code = vcrCode || 'DEFAULT';
  
  // Extract numeric portion from VCR code (e.g., "VCR-001" -> 1, "VCR-200" -> 200)
  const numericMatch = code.match(/\d+/);
  const numericValue = numericMatch ? parseInt(numericMatch[0], 10) : 0;
  
  // Use golden ratio for better color distribution
  const goldenRatio = 0.618033988749895;
  
  // Safe hue values: cyan (180), blue (220), purple (270), magenta (310)
  // Spread across these using the numeric value
  const baseHues = [180, 200, 220, 240, 260, 280, 300, 320];
  const hueIndex = numericValue % baseHues.length;
  const baseHue = baseHues[hueIndex];
  
  // Add variation within the hue range based on the full numeric value
  const hueOffset = ((numericValue * goldenRatio) % 1) * 20 - 10; // -10 to +10 variation
  const hue = Math.round(baseHue + hueOffset);
  
  // Vary saturation and lightness slightly for additional distinction
  const saturation = 55 + (numericValue % 15); // 55-70%
  const lightness = 88 + (numericValue % 5); // 88-93%
  const borderLightness = 60 + (numericValue % 10); // 60-70%
  
  return {
    background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
    accent: `hsl(${hue}, ${saturation + 15}%, ${lightness - 15}%)`,
  };
};

interface HandoverPointCardProps {
  handoverPoint: P2AHandoverPoint;
  onClick?: () => void;
  isDropTarget?: boolean;
  isDragging?: boolean;
  compact?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'SIGNED':
      return { 
        label: 'Signed', 
        color: 'bg-emerald-500', 
        icon: CheckCircle2,
        borderColor: 'border-emerald-500/30'
      };
    case 'READY':
      return { 
        label: 'Ready', 
        color: 'bg-blue-500', 
        icon: CheckCircle2,
        borderColor: 'border-blue-500/30'
      };
    case 'IN_PROGRESS':
      return { 
        label: 'In Progress', 
        color: 'bg-amber-500', 
        icon: Clock,
        borderColor: 'border-amber-500/30'
      };
    default:
      return { 
        label: 'Pending', 
        color: 'bg-slate-400', 
        icon: AlertTriangle,
        borderColor: 'border-border'
      };
  }
};

export const HandoverPointCard: React.FC<HandoverPointCardProps> = ({
  handoverPoint,
  onClick,
  isDropTarget = false,
  isDragging = false,
  compact = false,
}) => {
  const statusConfig = getStatusConfig(handoverPoint.status);
  const StatusIcon = statusConfig.icon;
  const vcrColor = getVCRColor(handoverPoint.vcr_code);

  // Calculate progress (mock for now - would be based on prerequisites)
  const progress = handoverPoint.status === 'SIGNED' ? 100 :
                   handoverPoint.status === 'READY' ? 90 :
                   handoverPoint.status === 'IN_PROGRESS' ? 50 : 0;

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-md border-2',
        isDropTarget && 'ring-2 ring-primary ring-offset-2',
        isDragging && 'opacity-50 shadow-lg rotate-2'
      )}
      style={{
        backgroundColor: isDropTarget ? 'hsl(var(--primary) / 0.05)' : vcrColor.background,
        borderColor: isDropTarget ? 'hsl(var(--primary))' : vcrColor.border,
      }}
      onClick={onClick}
    >
    <CardContent className="p-2">
        <div className="flex items-center gap-2">
          {/* Drag Handle - hidden by default, shown on hover */}
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Status indicator */}
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center shrink-0',
            statusConfig.color.replace('bg-', 'bg-').replace('500', '500/15'),
            statusConfig.color.replace('bg-', 'text-')
          )}>
            <StatusIcon className="w-3 h-3" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Name & Code Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium truncate">
                {handoverPoint.name}
              </span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground shrink-0">
                {handoverPoint.vcr_code?.replace(/^VCR-?/i, 'VCR-').slice(0, 7) || 'VCR-???'}
              </span>
            </div>

            {/* Progress % only */}
            <div className="flex items-center mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {progress}% complete
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Sortable + Droppable version for phase columns (supports vertical reordering)
export const DraggableHandoverPointCard: React.FC<HandoverPointCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.handoverPoint.id,
    data: {
      type: 'vcr',
      handoverPoint: props.handoverPoint,
    },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `vcr-${props.handoverPoint.id}`,
    data: {
      type: 'vcr',
      handoverPoint: props.handoverPoint,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={(node) => {
        setSortableRef(node);
        setDropRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isDragging && 'z-50')}
    >
      <HandoverPointCard {...props} isDropTarget={isOver} isDragging={isDragging} />
    </div>
  );
};

// Droppable-only version (legacy, for receiving systems)
export const DroppableHandoverPointCard: React.FC<HandoverPointCardProps> = (props) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `vcr-${props.handoverPoint.id}`,
    data: {
      type: 'vcr',
      handoverPoint: props.handoverPoint,
    },
  });

  return (
    <div ref={setNodeRef}>
      <HandoverPointCard {...props} isDropTarget={isOver} />
    </div>
  );
};
