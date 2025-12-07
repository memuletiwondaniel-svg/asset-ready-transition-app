import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Clock, FileText, AlertCircle } from 'lucide-react';

export interface PendingItem {
  id: string;
  uniqueId?: string;
  category: string;
  topic?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'na';
  responsible?: string;
}

interface ApproverPendingItemsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approver: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    pendingTasks: number;
  } | null;
  pendingItems: PendingItem[];
  onItemClick?: (itemId: string) => void;
}

export const ApproverPendingItemsOverlay: React.FC<ApproverPendingItemsOverlayProps> = ({
  open,
  onOpenChange,
  approver,
  pendingItems,
  onItemClick,
}) => {
  if (!approver) return null;

  const initials = approver.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const getStatusIcon = (status: PendingItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'na':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PendingItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">In Progress</Badge>;
      case 'na':
        return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Pending</Badge>;
    }
  };

  // Group items by category
  const groupedItems = pendingItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PendingItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={approver.avatar} alt={approver.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-semibold">{approver.name}</div>
              <div className="text-sm text-muted-foreground font-normal">{approver.role}</div>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {pendingItems.length} pending items
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No pending items for this approver.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {items.length} items
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onItemClick?.(item.id)}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/10 hover:border-primary/30 cursor-pointer transition-all group"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {item.uniqueId && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {item.uniqueId}
                                </span>
                              )}
                              <p className="text-sm font-medium text-foreground line-clamp-2">
                                {item.description}
                              </p>
                              {item.topic && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Topic: {item.topic}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
