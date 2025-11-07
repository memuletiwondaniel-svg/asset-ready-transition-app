import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, EyeOff, Maximize2, Minimize2, Settings } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  isExpanded?: boolean;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onToggleExpand?: () => void;
  onSettings?: () => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  children,
  className,
  isExpanded = false,
  isVisible = true,
  onToggleVisibility,
  onToggleExpand,
  onSettings
}) => {
  if (!isVisible) return null;

  return (
    <Card className={`glass-card overflow-hidden border-border/40 shadow-elevation-rest hover:shadow-elevation-hover hover:-translate-y-1 transition-all duration-300 ${isExpanded ? 'col-span-full' : ''} ${className}`}>
      <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
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
