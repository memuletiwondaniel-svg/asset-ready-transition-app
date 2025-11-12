import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useP2AHandovers, useP2ADeliverableCategories } from '@/hooks/useP2AHandovers';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-slate-300 dark:bg-slate-700';
    case 'IN_PROGRESS':
      return 'bg-blue-400';
    case 'BEHIND_SCHEDULE':
      return 'bg-red-500';
    case 'COMPLETED':
      return 'bg-green-500';
    case 'NOT_APPLICABLE':
      return 'bg-gray-300 dark:bg-gray-600';
    default:
      return 'bg-slate-300';
  }
};

export const P2AHeatmap: React.FC = () => {
  const { handovers, isLoading: loadingHandovers } = useP2AHandovers();
  const { categories, isLoading: loadingCategories } = useP2ADeliverableCategories();

  if (loadingHandovers || loadingCategories) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P2A Handover Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-lg">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">P2A Handover Heatmap</CardTitle>
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-700" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-blue-400" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>Behind</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" />
              <span>N/A</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Header Row */}
            <div className="flex border-b border-border/40 bg-muted/30">
              <div className="w-64 p-3 font-semibold text-sm border-r border-border/40 sticky left-0 bg-muted/30 z-10">
                Project
              </div>
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className="w-32 p-3 text-xs font-semibold text-center border-r border-border/40"
                >
                  {category.name}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {handovers?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No handovers found. Create your first P2A handover to get started.
              </div>
            ) : (
              handovers?.map((handover) => (
                <div key={handover.id} className="flex border-b border-border/40 hover:bg-muted/20">
                  <div className="w-64 p-3 border-r border-border/40 sticky left-0 bg-card z-10">
                    <div className="font-medium text-sm">
                      {handover.project?.project_id_prefix}-{handover.project?.project_id_number}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {handover.project?.project_title}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {handover.phase}
                    </Badge>
                  </div>
                  {categories?.map((category) => {
                    // For now, show random status - this will be replaced with actual deliverable data
                    const randomStatus = ['NOT_STARTED', 'IN_PROGRESS', 'BEHIND_SCHEDULE', 'COMPLETED', 'NOT_APPLICABLE'][
                      Math.floor(Math.random() * 5)
                    ];
                    return (
                      <div
                        key={category.id}
                        className="w-32 p-3 border-r border-border/40 flex items-center justify-center"
                      >
                        <div className={`w-16 h-8 rounded ${getStatusColor(randomStatus)}`} />
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};