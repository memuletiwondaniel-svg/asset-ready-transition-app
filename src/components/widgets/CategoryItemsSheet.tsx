import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, XCircle, FileCheck, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CategoryItemsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrId: string;
  categoryLabel: string;
  categoryIcon: React.ElementType;
  categoryColor: string;
}

interface VCRItemWithStatus {
  id: string;
  vcr_item: string;
  topic: string | null;
  category_name: string;
  category_code: string;
  status: string;
  prerequisite_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: React.ElementType }> = {
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-600', icon: CheckCircle2 },
  QUALIFICATION_APPROVED: { label: 'Qualified', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-600', icon: CheckCircle2 },
  READY_FOR_REVIEW: { label: 'In Review', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-600', icon: Clock },
  REJECTED: { label: 'Rejected', color: 'bg-red-50 border-red-200', textColor: 'text-red-600', icon: XCircle },
  QUALIFICATION_REQUESTED: { label: 'Qualification Raised', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-500', icon: AlertTriangle },
  NOT_STARTED: { label: 'Not Started', color: 'bg-muted border-border', textColor: 'text-muted-foreground', icon: FileCheck },
  PENDING: { label: 'Pending', color: 'bg-muted border-border', textColor: 'text-muted-foreground', icon: FileCheck },
};

// Map display labels to category names/codes in the database
const CATEGORY_MAP: Record<string, string[]> = {
  'Technical Integrity': ['Technical Integrity', 'TI'],
  'Design Integrity': ['Design Integrity', 'DI', 'DI2'],
  'Operating Integrity': ['Operating Integrity', 'OI'],
  'Management Systems': ['Management Systems', 'MS'],
  'HSE & Environment': ['HSE & Environment', 'HS', 'HSE'],
  'Maintenance Readiness': ['Maintenance Readiness', 'MR'],
};

export const CategoryItemsSheet: React.FC<CategoryItemsSheetProps> = ({
  open,
  onOpenChange,
  vcrId,
  categoryLabel,
  categoryIcon: CategoryIcon,
  categoryColor,
}) => {
  const { data: items, isLoading } = useQuery({
    queryKey: ['vcr-category-items', vcrId, categoryLabel],
    queryFn: async () => {
      // Get prerequisites for this VCR
      const { data: prereqs } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('id, summary, status, pac_prerequisite_id')
        .eq('handover_point_id', vcrId);

      // Get VCR items with their categories
      const categoryKeys = CATEGORY_MAP[categoryLabel] || [categoryLabel];
      
      const { data: vcrItems } = await supabase
        .from('vcr_items')
        .select(`
          id, vcr_item, topic,
          vcr_item_categories!vcr_items_category_id_fkey (name, code)
        `)
        .eq('is_active', true);

      if (!vcrItems) return [];

      // Filter items by category
      const filtered = (vcrItems as any[]).filter(item => {
        const cat = item.vcr_item_categories;
        if (!cat) return false;
        return categoryKeys.some(key => 
          cat.name?.toLowerCase() === key.toLowerCase() || 
          cat.code?.toLowerCase() === key.toLowerCase()
        );
      });

      // Map items with their prerequisite status
      return filtered.map(item => {
        const matchedPrereq = prereqs?.find(p => 
          p.summary?.toLowerCase().trim() === item.vcr_item?.toLowerCase().trim()
        );
        
        return {
          id: item.id,
          vcr_item: item.vcr_item,
          topic: item.topic,
          category_name: item.vcr_item_categories?.name || '',
          category_code: item.vcr_item_categories?.code || '',
          status: matchedPrereq?.status || 'NOT_STARTED',
          prerequisite_id: matchedPrereq?.id || null,
        } as VCRItemWithStatus;
      });
    },
    enabled: open && !!vcrId,
  });

  const completedCount = items?.filter(i => ['ACCEPTED', 'QUALIFICATION_APPROVED'].includes(i.status)).length || 0;
  const totalCount = items?.length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", categoryColor + '/10')}>
              <CategoryIcon className={cn("w-5 h-5", categoryColor)} />
            </div>
            <div>
              <SheetTitle>{categoryLabel}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedCount}/{totalCount} items completed
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !items?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No Items</p>
              <p className="text-xs text-muted-foreground mt-1">
                No VCR items found for this category.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => {
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.NOT_STARTED;
                const StatusIcon = statusCfg.icon;
                return (
                  <Card key={item.id} className="transition-colors hover:border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                          statusCfg.color
                        )}>
                          <StatusIcon className={cn("w-3.5 h-3.5", statusCfg.textColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {item.category_code}-{String(idx + 1).padStart(2, '0')}
                            </span>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5", statusCfg.color, statusCfg.textColor)}>
                              {statusCfg.label}
                            </Badge>
                          </div>
                          {item.topic && (
                            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{item.topic}</p>
                          )}
                          <p className="text-xs text-foreground line-clamp-2">{item.vcr_item}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
