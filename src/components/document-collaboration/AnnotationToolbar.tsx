import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MousePointer2, Highlighter, MessageCircle, Type,
  Pencil, Stamp, PenTool, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationType } from '@/hooks/useAttachmentCollaboration';

export type ToolMode = 'pointer' | AnnotationType;

const COLORS = ['#FFEB3B', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];

const TOOLS: { mode: ToolMode; icon: React.ElementType; label: string }[] = [
  { mode: 'pointer', icon: MousePointer2, label: 'Select' },
  { mode: 'highlight', icon: Highlighter, label: 'Highlight' },
  { mode: 'comment_pin', icon: MessageCircle, label: 'Comment' },
  { mode: 'text_box', icon: Type, label: 'Text Box' },
  { mode: 'drawing', icon: Pencil, label: 'Draw' },
  { mode: 'stamp', icon: Stamp, label: 'Stamp' },
];

interface AnnotationToolbarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}) => {
  return (
    <div className="flex flex-col gap-1 p-2 border-r border-border bg-card w-12 shrink-0">
      {/* Tools */}
      {TOOLS.map(({ mode, icon: Icon, label }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === mode ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8', activeTool === mode && 'bg-primary text-primary-foreground')}
              onClick={() => onToolChange(mode)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ))}

      <div className="border-t border-border my-1" />

      {/* Color picker */}
      <div className="flex flex-col items-center gap-1">
        {COLORS.map((color) => (
          <button
            key={color}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-transform',
              activeColor === color ? 'border-foreground scale-110' : 'border-transparent'
            )}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
          />
        ))}
      </div>

      <div className="border-t border-border my-1" />

      {/* Zoom controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zoom In</TooltipContent>
      </Tooltip>

      <span className="text-[10px] text-muted-foreground text-center">{Math.round(zoom * 100)}%</span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Zoom Out</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Reset Zoom</TooltipContent>
      </Tooltip>
    </div>
  );
};
