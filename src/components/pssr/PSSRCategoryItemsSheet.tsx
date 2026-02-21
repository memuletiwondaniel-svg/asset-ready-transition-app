import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, XCircle, FileCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PSSRItemDetailSheet } from './PSSRItemDetailSheet';

interface PSSRCategoryItemsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  categoryId: string;
  categoryName: string;
  categoryRefId: string;
  categoryIcon: React.ElementType;
  categoryColor: string;
}

interface PSSRItemWithStatus {
  id: string;
  itemCode: string;
  description: string;
  topic: string | null;
  responsible: string | null;
  status: string; // response status
  response: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: React.ElementType }> = {
  completed: { label: 'Completed', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-600', icon: CheckCircle2 },
  in_review: { label: 'In Review', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600', icon: Clock },
  pending: { label: 'Pending', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-600', icon: Clock },
  not_started: { label: 'Not Started', color: 'bg-muted border-border', textColor: 'text-muted-foreground', icon: FileCheck },
};

const ITEM_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-purple-100 text-purple-700',
];

function deriveStatus(response: string | null, status: string | null): string {
  if (status === 'approved' || response === 'YES' || response === 'NA') return 'completed';
  if (status === 'submitted' || status === 'in_review') return 'in_review';
  if (response) return 'pending';
  return 'not_started';
}

export const PSSRCategoryItemsSheet: React.FC<PSSRCategoryItemsSheetProps> = ({
  open,
  onOpenChange,
  pssrId,
  categoryId,
  categoryName,
  categoryRefId,
  categoryIcon: CategoryIcon,
  categoryColor,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['pssr-category-items-sheet', pssrId, categoryId],
    queryFn: async () => {
      // Fetch all checklist items in this category
      const { data: checklistItems, error: itemsError } = await supabase
        .from('pssr_checklist_items')
        .select('id, description, topic, responsible, sequence_number')
        .eq('category', categoryId)
        .eq('is_active', true)
        .order('sequence_number', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch responses for this PSSR
      const { data: responses, error: respError } = await supabase
        .from('pssr_checklist_responses')
        .select('checklist_item_id, response, status')
        .eq('pssr_id', pssrId);

      if (respError) throw respError;

      const responseMap = new Map(
        (responses || []).map(r => [r.checklist_item_id, { response: r.response, status: r.status }])
      );

      return (checklistItems || []).map((item, idx) => {
        const resp = responseMap.get(item.id);
        return {
          id: item.id,
          itemCode: `${categoryRefId}-${String(idx + 1).padStart(2, '0')}`,
          description: item.description,
          topic: item.topic,
          responsible: item.responsible,
          status: deriveStatus(resp?.response || null, resp?.status || null),
          response: resp?.response || null,
        } as PSSRItemWithStatus;
      });
    },
    enabled: open && !!pssrId && !!categoryId,
  });

  const completedCount = items?.filter(i => i.status === 'completed').length || 0;
  const totalCount = items?.length || 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', categoryColor)}>
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle>{categoryName}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedCount}/{totalCount} items completed
                </p>
              </div>
            </div>
            <SheetDescription className="sr-only">PSSR checklist items for {categoryName}</SheetDescription>
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
                  No checklist items found for this category.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <Card
                      key={item.id}
                      className="transition-colors hover:border-primary/30 cursor-pointer"
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn(
                                'text-[10px] px-1.5 font-mono border-0',
                                ITEM_COLORS[idx % ITEM_COLORS.length]
                              )}>
                                {item.itemCode}
                              </Badge>
                              <Badge variant="outline" className={cn('text-[9px] px-1.5', statusCfg.color, statusCfg.textColor)}>
                                {statusCfg.label}
                              </Badge>
                            </div>
                            {item.topic && (
                              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{item.topic}</p>
                            )}
                            <p className="text-xs text-foreground line-clamp-2">{item.description}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
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

      <PSSRItemDetailSheet
        itemId={selectedItemId}
        pssrId={pssrId}
        open={!!selectedItemId}
        onOpenChange={(o) => !o && setSelectedItemId(null)}
      />
    </>
  );
};
