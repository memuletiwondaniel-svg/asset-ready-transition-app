import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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
  defaultExpanded?: boolean;
  onViewAll?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
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
  defaultExpanded = false,
  onViewAll,
  isEmpty = false,
  emptyMessage = 'No items',
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
      {/* New task indicator glow */}
      {newCount > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 animate-pulse" />
      )}
      
      <CardHeader className={cn("pb-3", !isExpanded && "py-6")}>
        <div className="flex items-center justify-between min-h-[72px]">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-br",
              iconColorClass
            )}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-bold text-foreground">{primaryStat}</span>
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
          
          <div className="flex items-center gap-3">
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
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-10 w-10 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : isEmpty ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {children}
              {onViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="w-full mt-2 text-primary hover:text-primary/80"
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
