import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, EyeOff, Maximize2, Minimize2, Settings, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetCardProps {
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
  dragListeners
}) => {
  if (!isVisible) return null;

  return (
    <Card className={`glass-card overflow-hidden border-border/40 shadow-elevation-rest hover:shadow-elevation-hover hover:-translate-y-1 transition-all duration-300 group ${isExpanded ? 'col-span-full' : ''} ${className}`}>
      <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </Button>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 bg-background">
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
      </CardHeader>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
};
