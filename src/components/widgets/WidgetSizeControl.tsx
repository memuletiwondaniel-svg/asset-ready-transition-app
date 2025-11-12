import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Minimize2, Square, Maximize2 } from 'lucide-react';
import { useWidgetSize, WidgetSize } from '@/contexts/WidgetSizeContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';

export const WidgetSizeControl: React.FC = () => {
  const { widgetSize, setWidgetSize } = useWidgetSize();

  const sizeOptions: { value: WidgetSize; label: string; icon: React.ReactNode; description: string }[] = [
    { 
      value: 'compact', 
      label: 'Compact', 
      icon: <Minimize2 className="h-4 w-4" />,
      description: '280-320px height'
    },
    { 
      value: 'standard', 
      label: 'Standard', 
      icon: <Square className="h-4 w-4" />,
      description: '350-400px height'
    },
    { 
      value: 'tall', 
      label: 'Tall', 
      icon: <Maximize2 className="h-4 w-4" />,
      description: '450-520px height'
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {sizeOptions.find(opt => opt.value === widgetSize)?.icon}
          Widget Size
          <Badge variant="secondary" className="ml-1">
            {sizeOptions.find(opt => opt.value === widgetSize)?.label}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Widget Display Size</h4>
            <p className="text-xs text-muted-foreground">
              Choose how tall widgets appear on your dashboard
            </p>
          </div>
          
          <div className="space-y-2">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setWidgetSize(option.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  widgetSize === option.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/5'
                }`}
              >
                <div className={`p-2 rounded-md ${
                  widgetSize === option.value 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
                {widgetSize === option.value && (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>💡 Heights auto-adjust for mobile, tablet, and desktop screens</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
