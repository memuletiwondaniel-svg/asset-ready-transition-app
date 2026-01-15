import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';
import { usePSSRCategoryItems, CategoryItem } from '@/hooks/usePSSRCategoryProgress';

interface CategoryItemsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  categoryName: string | null;
  categoryStats?: {
    completed: number;
    total: number;
    percentage: number;
  };
  onItemClick?: (item: CategoryItem) => void;
}

const getStatusBadge = (item: CategoryItem) => {
  // If approved by TA
  if (item.approval_status === 'approved') {
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  
  if (item.approval_status === 'approved_with_action') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Action Required
      </Badge>
    );
  }
  
  if (item.approval_status === 'rejected') {
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
        <X className="h-3 w-3" />
        Rejected
      </Badge>
    );
  }

  // Based on response
  if (item.response === 'YES') {
    return (
      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
        Yes
      </Badge>
    );
  }
  
  if (item.response === 'NO' || item.response === 'DEVIATION') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
        Deviation
      </Badge>
    );
  }
  
  if (item.response === 'NA') {
    return <Badge variant="secondary">N/A</Badge>;
  }
  
  // Pending
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
};

const getStatusIcon = (item: CategoryItem) => {
  if (item.approval_status === 'approved' || item.response === 'YES' || item.response === 'NA') {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (item.response === 'NO' || item.response === 'DEVIATION' || item.approval_status === 'approved_with_action') {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  }
  if (item.approval_status === 'rejected') {
    return <X className="h-5 w-5 text-destructive" />;
  }
  return <Clock className="h-5 w-5 text-muted-foreground" />;
};

export const CategoryItemsOverlay: React.FC<CategoryItemsOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  categoryName,
  categoryStats,
  onItemClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: items, isLoading } = usePSSRCategoryItems(pssrId, categoryName);

  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.unique_id.toLowerCase().includes(query) ||
      item.question.toLowerCase().includes(query)
    );
  }) || [];

  // Group items by status for summary
  const statusCounts = {
    completed: items?.filter(i => i.response === 'YES' || i.response === 'NA' || i.approval_status === 'approved').length || 0,
    deviation: items?.filter(i => i.response === 'NO' || i.response === 'DEVIATION').length || 0,
    pending: items?.filter(i => !i.response).length || 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{categoryName}</DialogTitle>
              <DialogDescription>
                {categoryStats?.completed || 0} of {categoryStats?.total || 0} items completed
              </DialogDescription>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{categoryStats?.percentage || 0}%</span>
            </div>
            <Progress value={categoryStats?.percentage || 0} className="h-2" />
          </div>

          {/* Status Summary */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">{statusCounts.completed} Complete</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">{statusCounts.deviation} Deviation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{statusCounts.pending} Pending</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </DialogHeader>

        {/* Items List */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? 'No items match your search.' : 'No items in this category.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  {getStatusIcon(item)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {item.unique_id}
                      </code>
                      {getStatusBadge(item)}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{item.question}</p>
                    {item.narrative && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {item.narrative}
                      </p>
                    )}
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryItemsOverlay;
