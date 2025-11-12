import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2, RotateCcw, Eye, EyeOff, Maximize2 } from 'lucide-react';

export interface WidgetSettings {
  id: string;
  name: string;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
}

interface WidgetCustomizationToolbarProps {
  widgets: WidgetSettings[];
  onVisibilityChange: (widgetId: string, visible: boolean) => void;
  onSizeChange: (widgetId: string, size: 'small' | 'medium' | 'large') => void;
  onResetLayout: () => void;
}

export const WidgetCustomizationToolbar: React.FC<WidgetCustomizationToolbarProps> = ({
  widgets,
  onVisibilityChange,
  onSizeChange,
  onResetLayout,
}) => {
  const visibleCount = widgets.filter(w => w.visible).length;

  return (
    <div className="flex items-center gap-2 mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Customize Widgets
            <Badge variant="secondary" className="ml-1">
              {visibleCount}/{widgets.length}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>Widget Visibility</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {widgets.map((widget) => (
            <DropdownMenuSub key={widget.id}>
              <DropdownMenuSubTrigger>
                <div className="flex items-center gap-2 flex-1">
                  {widget.visible ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={widget.visible ? '' : 'text-muted-foreground'}>
                    {widget.name}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {widget.size}
                  </Badge>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuLabel className="text-xs">Widget Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={widget.visible}
                  onCheckedChange={(checked) => onVisibilityChange(widget.id, checked)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show Widget
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Size</DropdownMenuLabel>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <DropdownMenuCheckboxItem
                    key={size}
                    checked={widget.size === size}
                    onCheckedChange={() => onSizeChange(widget.id, size)}
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={onResetLayout}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Reset Layout
      </Button>
    </div>
  );
};
