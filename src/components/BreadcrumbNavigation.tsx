import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { cn } from '@/lib/utils';

interface BreadcrumbNavigationProps {
  currentPageLabel: string;
  className?: string;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  currentPageLabel,
  className
}) => {
  const { 
    buildBreadcrumbsFromPath, 
    canGoBack, 
    canGoForward, 
    goBack, 
    goForward,
    history,
    currentHistoryIndex
  } = useBreadcrumb();

  const breadcrumbs = buildBreadcrumbsFromPath();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Back/Forward Navigation Buttons */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                disabled={!canGoBack}
                className="h-8 w-8 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {canGoBack && currentHistoryIndex > 0 
                ? `Back to ${history[currentHistoryIndex - 1]?.label}`
                : 'No previous page'
              }
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={goForward}
                disabled={!canGoForward}
                className="h-8 w-8 rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {canGoForward && currentHistoryIndex < history.length - 1
                ? `Forward to ${history[currentHistoryIndex + 1]?.label}`
                : 'No next page'
              }
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Vertical Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Breadcrumb Trail */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          {breadcrumbs.slice(0, -1).map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={crumb.onClick} 
                  className="cursor-pointer hover:text-foreground transition-colors text-xs"
                >
                  {crumb.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-xs" />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-foreground text-xs">
              {currentPageLabel}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
