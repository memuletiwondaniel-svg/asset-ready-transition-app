import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { usePSSRPriorityActions, PSSRPriorityAction } from '@/hooks/usePSSRPriorityActions';
import { format, isPast, isToday } from 'date-fns';

interface PriorityActionsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pssrId: string;
  onAddAction?: () => void;
  onActionClick?: (action: PSSRPriorityAction) => void;
}

export const PriorityActionsOverlay: React.FC<PriorityActionsOverlayProps> = ({
  open,
  onOpenChange,
  pssrId,
  onAddAction,
  onActionClick,
}) => {
  const { actions, isLoading, stats, updateActionStatus } = usePSSRPriorityActions(pssrId);
  
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'A' | 'B'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter actions based on filters
  const filteredActions = useMemo(() => {
    if (!actions) return [];
    
    return actions.filter(action => {
      // Priority filter
      if (priorityFilter !== 'all' && action.priority !== priorityFilter) return false;
      
      // Status filter
      if (statusFilter !== 'all' && action.status !== statusFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = action.description.toLowerCase().includes(query);
        const matchesOwner = action.action_owner_name?.toLowerCase().includes(query);
        const matchesRole = action.item_approval?.approver_role?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesOwner && !matchesRole) return false;
      }
      
      return true;
    });
  }, [actions, priorityFilter, statusFilter, searchQuery]);

  // Group by priority
  const priorityAActions = filteredActions.filter(a => a.priority === 'A');
  const priorityBActions = filteredActions.filter(a => a.priority === 'B');

  const handleStatusChange = (actionId: string, newStatus: 'open' | 'in_progress' | 'closed') => {
    updateActionStatus.mutate({ actionId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0">
            <AlertCircle className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
    }
  };

  const isOverdue = (targetDate: string | null, status: string) => {
    if (!targetDate || status === 'closed') return false;
    const date = new Date(targetDate);
    return isPast(date) && !isToday(date);
  };

  const completionPercentage = stats.total > 0 
    ? Math.round(((stats.priorityA.closed + stats.priorityB.closed) / stats.total) * 100)
    : 0;

  const renderActionCard = (action: PSSRPriorityAction) => {
    const overdue = isOverdue(action.target_date, action.status);
    
    return (
      <div
        key={action.id}
        onClick={() => onActionClick?.(action)}
        className="p-4 bg-card border border-border/50 rounded-lg hover:bg-accent/10 hover:border-primary/30 cursor-pointer transition-all group"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
              action.priority === 'A' 
                ? 'bg-red-500 text-white' 
                : 'bg-orange-500 text-white'
            }`}>
              <span className="text-xs font-bold">{action.priority}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed">
                {action.description}
              </p>
              {action.item_approval?.approver_role && (
                <p className="text-xs text-muted-foreground mt-1">
                  Source: {action.item_approval.approver_role}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge(action.status)}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {action.action_owner_name && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {action.action_owner_name}
              </span>
            )}
            {action.target_date && (
              <span className={`flex items-center gap-1.5 ${overdue ? 'text-destructive font-medium' : ''}`}>
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(action.target_date), 'MMM d, yyyy')}
                {overdue && <AlertTriangle className="h-3 w-3" />}
              </span>
            )}
          </div>
          
          {action.status !== 'closed' && (
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              {action.status === 'open' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleStatusChange(action.id, 'in_progress')}
                  disabled={updateActionStatus.isPending}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Start
                </Button>
              )}
              <Button 
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleStatusChange(action.id, 'closed')}
                disabled={updateActionStatus.isPending}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Priority Actions</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {stats.total} total • {stats.priorityA.open + stats.priorityB.open} open
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {completionPercentage}% Complete
              </Badge>
              {onAddAction && (
                <Button size="sm" onClick={onAddAction} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Action
                </Button>
              )}
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">Priority A (Before Startup)</span>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs border-0">
                  {stats.priorityA.open} open
                </Badge>
              </div>
              <Progress 
                value={stats.priorityA.total > 0 ? (stats.priorityA.closed / stats.priorityA.total) * 100 : 0} 
                className="h-1.5"
              />
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1.5">
                {stats.priorityA.closed} of {stats.priorityA.total} closed
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Priority B (After Startup)</span>
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 text-xs border-0">
                  {stats.priorityB.open} open
                </Badge>
              </div>
              <Progress 
                value={stats.priorityB.total > 0 ? (stats.priorityB.closed / stats.priorityB.total) * 100 : 0} 
                className="h-1.5"
              />
              <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1.5">
                {stats.priorityB.closed} of {stats.priorityB.total} closed
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
          {/* Priority Tabs */}
          <Tabs value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)} className="flex-shrink-0">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
              <TabsTrigger value="A" className="text-xs px-3 h-7">
                <span className="w-4 h-4 rounded bg-red-500 text-white text-[10px] font-bold flex items-center justify-center mr-1.5">A</span>
                Pr 1
              </TabsTrigger>
              <TabsTrigger value="B" className="text-xs px-3 h-7">
                <span className="w-4 h-4 rounded bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center mr-1.5">B</span>
                Pr 2
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description, owner, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions List */}
        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="text-sm font-medium text-foreground">
                {stats.total === 0 ? 'No priority actions recorded' : 'No actions match your filters'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total === 0 
                  ? 'Priority actions will appear here when created during reviews or walkdowns.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Priority A Section */}
              {priorityAActions.length > 0 && (priorityFilter === 'all' || priorityFilter === 'A') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded bg-red-500 text-white text-xs font-bold flex items-center justify-center">A</span>
                    <h3 className="text-sm font-medium text-foreground">Priority A - Before Startup ({priorityAActions.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {priorityAActions.map(renderActionCard)}
                  </div>
                </div>
              )}
              
              {/* Priority B Section */}
              {priorityBActions.length > 0 && (priorityFilter === 'all' || priorityFilter === 'B') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded bg-orange-500 text-white text-xs font-bold flex items-center justify-center">B</span>
                    <h3 className="text-sm font-medium text-foreground">Priority B - After Startup ({priorityBActions.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {priorityBActions.map(renderActionCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
