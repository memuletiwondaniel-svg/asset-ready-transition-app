import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, FileText, AlertCircle, Bell, Send, X, Search, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  onSendReminder?: (personId: string, message: string) => Promise<void>;
}

export const ApproverPendingItemsOverlay: React.FC<ApproverPendingItemsOverlayProps> = ({
  open,
  onOpenChange,
  approver,
  pendingItems,
  onItemClick,
  onSendReminder,
}) => {
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'na'>('all');

  if (!approver) return null;

  const initials = approver.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const defaultMessage = `Hi ${approver.name},\n\nThis is a friendly reminder that you have ${pendingItems.length} pending item(s) requiring your attention.\n\nPlease review and complete these items at your earliest convenience.\n\nThank you.`;

  const handleOpenReminderForm = () => {
    setReminderMessage(defaultMessage);
    setShowReminderForm(true);
  };

  const handleCancelReminder = () => {
    setShowReminderForm(false);
    setReminderMessage('');
  };

  const handleSendReminder = async () => {
    if (!onSendReminder || !reminderMessage.trim()) return;
    
    setIsSending(true);
    try {
      await onSendReminder(approver.id, reminderMessage);
      toast({
        title: 'Reminder Sent',
        description: `Reminder has been sent to ${approver.name}.`,
      });
      setShowReminderForm(false);
      setReminderMessage('');
    } catch (error) {
      toast({
        title: 'Failed to Send',
        description: 'Could not send the reminder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
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
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>;
    }
  };

  // Filter items based on search and status
  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group filtered items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PendingItem[]>);

  const hasPendingItems = pendingItems.length > 0;
  const isFiltering = searchQuery !== '' || statusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={approver.avatar} alt={approver.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-xl font-semibold">{approver.name}</div>
              <div className="text-sm text-muted-foreground font-normal">{approver.role}</div>
            </div>
            {(() => {
              const totalItems = pendingItems.length;
              const completedItems = pendingItems.filter(item => item.status === 'completed').length;
              const pendingCount = pendingItems.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
              const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
              
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {isFiltering && filteredItems.length !== totalItems
                      ? `${filteredItems.length} of ${totalItems} items`
                      : `${pendingCount} of ${totalItems} items pending`
                    }
                  </Badge>
                  <Badge variant="outline" className="text-sm px-3 py-1 text-green-600 border-green-200 bg-green-50">
                    {progressPercent}% complete
                  </Badge>
                </div>
              );
            })()}
          </DialogTitle>
        </DialogHeader>

        {/* Reminder Form */}
        {showReminderForm && (
          <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Send Reminder to {approver.name}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCancelReminder}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              placeholder="Enter your reminder message..."
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelReminder}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendReminder}
                disabled={isSending || !reminderMessage.trim()}
                className="gap-1.5"
              >
                {isSending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Reminder
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        {hasPendingItems && (
          <div className="flex items-center gap-3 pb-3 border-b border-border flex-shrink-0">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, description, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter Dropdown */}
            <Select value={statusFilter} onValueChange={(val: typeof statusFilter) => setStatusFilter(val)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="na">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4 min-h-0">
          {pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                No pending items for this approver.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Matching Items</h3>
              <p className="text-muted-foreground">
                No items match your search criteria.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-2">
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
                        className="flex items-start gap-3 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/10 hover:border-primary/30 cursor-pointer transition-all group"
                      >
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
                                  {item.topic}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(item.status)}
                              {onSendReminder && item.status !== 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReminderForm();
                                  }}
                                  title="Send reminder"
                                >
                                  <Bell className="h-3.5 w-3.5" />
                                </Button>
                              )}
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

        {/* Footer with Send Reminder Button */}
        {hasPendingItems && onSendReminder && !showReminderForm && (
          <div className="border-t border-border pt-4 mt-2 flex justify-end flex-shrink-0">
            <Button
              onClick={handleOpenReminderForm}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Send Reminder to {approver.name.split(' ')[0]}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};