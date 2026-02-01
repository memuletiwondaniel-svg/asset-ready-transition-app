import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MyTasksPanelCardProps {
  title: string;
  icon: React.ReactNode;
  iconColorClass: string;
  primaryStat: number;
  primaryLabel: string;
  secondaryStat?: number;
  secondaryLabel?: string;
  newCount?: number;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewAll?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  /** Whether another card in the grid is expanded (dims this card) */
  isDimmed?: boolean;
}

export const MyTasksPanelCard: React.FC<MyTasksPanelCardProps> = ({
  title,
  icon,
  iconColorClass,
  primaryStat,
  primaryLabel,
  secondaryStat,
  secondaryLabel,
  newCount = 0,
  children,
  isExpanded,
  onToggleExpand,
  onViewAll,
  isEmpty = false,
  emptyMessage = 'No items',
  isLoading = false,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
}) => {
  const handleCardClick = () => {
    if (!isExpanded) {
      onToggleExpand();
    }
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-card/90 to-card/70",
        "backdrop-blur-sm border-border/50",
        "shadow-sm transition-all duration-500 ease-out",
        "group",
        isFullHeight && "h-full flex flex-col",
        isFullHeight && isExpanded && "ring-2 ring-primary/20 shadow-xl shadow-primary/10",
        isRelocated && "animate-card-relocate",
        // Dim effect when another card is expanded - more prominent
        isDimmed ? [
          "opacity-40 scale-[0.97] grayscale-[30%]",
          "hover:opacity-60 hover:scale-[0.99] hover:grayscale-0",
          "pointer-events-auto"
        ] : [
          "hover:shadow-lg hover:shadow-primary/5",
          "hover:border-primary/20",
          !isExpanded && "hover:-translate-y-0.5 cursor-pointer"
        ]
      )}
      onClick={handleCardClick}
    >
      {/* New task indicator glow */}
      {newCount > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 animate-pulse" />
      )}
      
      {/* Expansion glow effect */}
      {isFullHeight && isExpanded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      )}
      
      <CardHeader className={cn("pb-3 shrink-0", !isExpanded && "py-6")}>
        <div className="flex items-center justify-between min-h-[72px]">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-br transition-all duration-300",
              "group-hover:scale-105 group-hover:rotate-3",
              isExpanded && isFullHeight && "scale-110 rotate-0",
              iconColorClass
            )}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "font-bold text-foreground transition-all duration-300",
                  isFullHeight && isExpanded ? "text-4xl" : "text-3xl"
                )}>{primaryStat}</span>
                <span className="text-sm text-muted-foreground">{primaryLabel}</span>
                {secondaryStat !== undefined && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-sm text-muted-foreground">
                      {secondaryStat} {secondaryLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <Badge 
                variant="default" 
                className="bg-primary/90 text-primary-foreground animate-pulse-glow flex items-center gap-1 px-3 py-1"
              >
                <Sparkles className="h-3 w-3" />
                {newCount} New
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={cn(
                "h-10 w-10 p-0 transition-all duration-300",
                isExpanded && isFullHeight && "bg-primary/10 hover:bg-primary/20"
              )}
            >
              {isExpanded ? (
                isFullHeight ? (
                  <Minimize2 className="h-5 w-5 transition-transform duration-300" />
                ) : (
                  <ChevronUp className="h-5 w-5 transition-transform duration-300" />
                )
              ) : (
                isFullHeight ? (
                  <Maximize2 className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <ChevronDown className="h-5 w-5 transition-transform duration-300 group-hover:translate-y-0.5" />
                )
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className={cn(
          "pt-0 animate-fade-in",
          isFullHeight && "flex-1 flex flex-col min-h-0"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : isEmpty ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className={cn(
              "space-y-2",
              isFullHeight && "flex-1 flex flex-col min-h-0 overflow-hidden"
            )}>
              <ScrollArea className={cn(
                "transition-all duration-300",
                isFullHeight ? "flex-1 h-0 min-h-0 pr-4" : "max-h-[280px]"
              )}>
                <div className="space-y-2 pb-2">
                  {children}
                </div>
              </ScrollArea>
              {onViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="w-full mt-2 text-primary hover:text-primary/80 hover:bg-primary/5 transition-all duration-200 shrink-0"
                >
                  View all →
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
