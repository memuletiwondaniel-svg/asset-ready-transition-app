import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  customBreadcrumbs?: Array<{
    label: string;
    path: string;
    onClick?: () => void;
  }>;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  currentPageLabel,
  className,
  customBreadcrumbs
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

  const breadcrumbs = customBreadcrumbs || buildBreadcrumbsFromPath();
  const location = useLocation();
  const crumbsToShow = location.pathname === '/pssr' ? breadcrumbs : breadcrumbs.slice(0, -1);

  const backHistory = history.slice(0, currentHistoryIndex).reverse();
  const forwardHistory = history.slice(currentHistoryIndex + 1);

  const navigateToHistoryIndex = (index: number) => {
    const item = history[index];
    if (item) {
      window.history.pushState(null, '', item.path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Back/Forward Navigation Buttons */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {/* Back Button with Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      if (e.detail === 1) {
                        goBack();
                      }
                    }}
                    disabled={!canGoBack}
                    className="h-8 w-8 rounded-lg disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {canGoBack && currentHistoryIndex > 0 
                  ? `Back to ${history[currentHistoryIndex - 1]?.label}`
                  : 'No previous page'
                }
              </TooltipContent>
            </Tooltip>
            {canGoBack && (
              <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
                {backHistory.map((item, index) => {
                  const actualIndex = currentHistoryIndex - index - 1;
                  return (
                    <DropdownMenuItem
                      key={`${item.path}-${item.timestamp}`}
                      onClick={() => navigateToHistoryIndex(actualIndex)}
                      className="cursor-pointer text-xs py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground text-[10px]">{item.path}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            )}
          </DropdownMenu>

          {/* Forward Button with Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      if (e.detail === 1) {
                        goForward();
                      }
                    }}
                    disabled={!canGoForward}
                    className="h-8 w-8 rounded-lg disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {canGoForward && currentHistoryIndex < history.length - 1
                  ? `Forward to ${history[currentHistoryIndex + 1]?.label}`
                  : 'No next page'
                }
              </TooltipContent>
            </Tooltip>
            {canGoForward && (
              <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
                {forwardHistory.map((item, index) => {
                  const actualIndex = currentHistoryIndex + index + 1;
                  return (
                    <DropdownMenuItem
                      key={`${item.path}-${item.timestamp}`}
                      onClick={() => navigateToHistoryIndex(actualIndex)}
                      className="cursor-pointer text-xs py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground text-[10px]">{item.path}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </TooltipProvider>

      {/* Vertical Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Breadcrumb Trail */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          {crumbsToShow.map((crumb, index) => (
            <React.Fragment key={`crumb-${index}`}>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <span 
                    onClick={crumb.onClick}
                    className="cursor-pointer hover:text-foreground transition-colors text-xs"
                  >
                    {crumb.label}
                  </span>
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
