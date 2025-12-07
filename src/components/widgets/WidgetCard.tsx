import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, EyeOff, Maximize2, Minimize2, Settings, GripVertical, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

export interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  isExpanded?: boolean;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onToggleExpand?: () => void;
  onSettings?: () => void;
  dragAttributes?: any;
  dragListeners?: any;
  widgetId?: string;
  enableFullscreen?: boolean;
  headerAction?: React.ReactNode;
  showHeaderActionOnHover?: boolean;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  children,
  className,
  isExpanded = false,
  isVisible = true,
  onToggleVisibility,
  onToggleExpand,
  onSettings,
  dragAttributes,
  dragListeners,
  widgetId,
  enableFullscreen = true,
  headerAction,
  showHeaderActionOnHover = false,
}) => {
  const { setFullscreenWidget } = useWidgetSize();
  
  if (!isVisible) return null;

  const handleFullscreen = () => {
    if (widgetId && enableFullscreen) {
      setFullscreenWidget(widgetId);
    }
  };

  return (
    <Card className={`glass-card overflow-hidden border-border/40 shadow-elevation-rest hover:shadow-elevation-hover hover:-translate-y-1 transition-all duration-300 group ${isExpanded ? 'col-span-full' : ''} flex flex-col h-full ${className || ''}`}>
      <CardHeader 
        className="border-b border-border/40 pb-3 pt-3 flex flex-row items-center justify-between space-y-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent relative overflow-hidden cursor-pointer select-none"
        onDoubleClick={handleFullscreen}
      >
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        
        <div className="flex items-center gap-3 flex-1 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </Button>
          <CardTitle className="text-lg font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1 relative z-10">
          {headerAction && (
            <div className={`transition-all duration-200 ${showHeaderActionOnHover ? 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0' : ''}`}>
              {headerAction}
            </div>
          )}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 relative z-10">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 bg-background">
            {enableFullscreen && widgetId && (
              <DropdownMenuItem onClick={handleFullscreen}>
                <Maximize className="w-4 h-4 mr-2" />
                Fullscreen
              </DropdownMenuItem>
            )}
            {onToggleExpand && (
              <DropdownMenuItem onClick={onToggleExpand}>
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-4 h-4 mr-2" />
                    Collapse
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Expand
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onToggleVisibility && (
              <DropdownMenuItem onClick={onToggleVisibility}>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide
              </DropdownMenuItem>
            )}
            {onSettings && (
              <DropdownMenuItem onClick={onSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 min-h-0">
        {children}
      </CardContent>
    </Card>
  );
};
