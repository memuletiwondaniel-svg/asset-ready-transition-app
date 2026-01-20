import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useP2AHandovers, useP2ADeliverableCategories } from '@/hooks/useP2AHandovers';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { P2AHeatmapCell } from './P2AHeatmapCell';
import { P2AHeatmapCellDialog, HeatmapCellClickData } from './P2AHeatmapCellDialog';
import { useNavigate } from 'react-router-dom';
import { useP2AHeatmapData } from '@/hooks/useP2AHeatmapData';
import { getProjectColor } from '@/utils/projectColors';

export const P2AHeatmap: React.FC = () => {
  const { handovers, isLoading: loadingHandovers } = useP2AHandovers();
  const { categories, isLoading: loadingCategories } = useP2ADeliverableCategories();
  const { heatmapData, isLoading: loadingHeatmapData } = useP2AHeatmapData();
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<HeatmapCellClickData | null>(null);

  if (loadingHandovers || loadingCategories || loadingHeatmapData) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">P2A Handover Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border-b border-border/40 p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-bold">P2A Handover Heatmap</CardTitle>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-white border border-muted-foreground/30" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 dark:bg-gray-600" />
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
              <div className="w-32 sm:w-44 p-1.5 sm:p-2 font-semibold text-[10px] sm:text-xs border-r border-border/40 sticky left-0 bg-muted/30 z-10">
                Project
              </div>
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className="w-14 sm:w-16 p-1 sm:p-1.5 text-[8px] sm:text-[10px] font-semibold text-center border-r border-border/40 leading-tight"
                >
                  {category.name}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {handovers?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No handovers found. Create your first P2A handover to get started.
              </div>
            ) : (
              handovers?.map((handover) => {
                const prefix = handover.project?.project_id_prefix || '';
                const number = handover.project?.project_id_number || '';
                const projectColor = getProjectColor(prefix, number);
                
                return (
                <div key={handover.id} className="flex border-b border-border/40 hover:bg-muted/20">
                  <div 
                    className="w-32 sm:w-44 p-1.5 sm:p-2 border-r border-border/40 sticky left-0 bg-card z-10 cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => navigate(`/project/${handover.project_id}`)}
                  >
                    <Badge 
                      variant="outline" 
                      className="text-[10px] sm:text-xs font-semibold px-2 py-1 text-white border-0 mb-0.5 inline-flex items-center justify-center leading-none"
                      style={{ background: `linear-gradient(to right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }}
                    >
                      {prefix}-{number}
                    </Badge>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                      {handover.project?.project_title}
                    </div>
                  </div>
                  {categories?.map((category) => {
                    const cellKey = `${handover.id}-${category.id}`;
                    const cellData = heatmapData.get(cellKey);
                    
                    // Use actual data if available, otherwise show NOT_STARTED
                    const status = cellData?.status || 'NOT_STARTED';
                    const percentage = cellData?.completionPercentage || 0;
                    
                    return (
                      <div
                        key={category.id}
                        className="w-14 sm:w-16 p-1 sm:p-1.5 border-r border-border/40 flex items-center justify-center"
                      >
                        <P2AHeatmapCell 
                          handoverId={handover.id}
                          categoryId={category.id}
                          status={status}
                          percentage={percentage}
                          categoryName={cellData?.categoryName || category.name}
                          latestComment={cellData?.latestComment}
                          lastUpdated={cellData?.lastUpdated}
                          deliverableCount={cellData?.deliverableCount}
                          completedCount={cellData?.completedCount}
                          onCellClick={setSelectedCell}
                        />
                      </div>
                    );
                  })}
                </div>
              );
              })
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>

      <P2AHeatmapCellDialog
        open={!!selectedCell}
        onOpenChange={(open) => !open && setSelectedCell(null)}
        cellData={selectedCell}
      />
    </Card>
  );
};