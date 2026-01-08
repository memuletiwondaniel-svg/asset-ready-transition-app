import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { usePSSRPriorityActions } from '@/hooks/usePSSRPriorityActions';
import { format } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PriorityActionsWidgetProps {
  pssrId: string;
  showSignOffBlock?: boolean;
}

export const PriorityActionsWidget: React.FC<PriorityActionsWidgetProps> = ({ 
  pssrId,
  showSignOffBlock = true 
}) => {
  const { actions, isLoading, stats, canSignOff, updateActionStatus } = usePSSRPriorityActions(pssrId);
  const [expandedPriority, setExpandedPriority] = useState<'A' | 'B' | null>('A');

  const priorityAActions = actions?.filter(a => a.priority === 'A') || [];
  const priorityBActions = actions?.filter(a => a.priority === 'B') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return <Badge className="bg-green-100 text-green-800">Closed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Open</Badge>;
    }
  };

  const handleStatusChange = (actionId: string, newStatus: 'open' | 'in_progress' | 'closed') => {
    updateActionStatus.mutate({ actionId, status: newStatus });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
            Priority Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
            Priority Actions
          </span>
          <Badge variant="outline">
            {stats.total} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Sign-off Warning */}
        {showSignOffBlock && !canSignOff && stats.priorityA.total > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              <strong>{stats.priorityA.open}</strong> Priority A action(s) must be closed before PSSR can be signed off.
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">Priority A</span>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                {stats.priorityA.closed}/{stats.priorityA.total}
              </Badge>
            </div>
            <Progress 
              value={stats.priorityA.total > 0 ? (stats.priorityA.closed / stats.priorityA.total) * 100 : 0} 
              className="h-2"
            />
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Before startup</p>
          </div>
          
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Priority B</span>
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                {stats.priorityB.closed}/{stats.priorityB.total}
              </Badge>
            </div>
            <Progress 
              value={stats.priorityB.total > 0 ? (stats.priorityB.closed / stats.priorityB.total) * 100 : 0} 
              className="h-2"
            />
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">After startup</p>
          </div>
        </div>

        {/* Priority A Actions */}
        {priorityAActions.length > 0 && (
          <Collapsible open={expandedPriority === 'A'} onOpenChange={() => setExpandedPriority(expandedPriority === 'A' ? null : 'A')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-red-500 text-white text-xs font-bold flex items-center justify-center">A</span>
                  <span className="text-sm font-medium">Priority A Actions ({priorityAActions.length})</span>
                </span>
                {expandedPriority === 'A' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {priorityAActions.map(action => (
                <div key={action.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm flex-1">{action.description}</p>
                    {getStatusBadge(action.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {action.action_owner_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {action.action_owner_name}
                      </span>
                    )}
                    {action.target_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(action.target_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  {action.status !== 'closed' && (
                    <div className="flex gap-2 mt-2">
                      {action.status === 'open' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(action.id, 'in_progress')}
                          disabled={updateActionStatus.isPending}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => handleStatusChange(action.id, 'closed')}
                        disabled={updateActionStatus.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Priority B Actions */}
        {priorityBActions.length > 0 && (
          <Collapsible open={expandedPriority === 'B'} onOpenChange={() => setExpandedPriority(expandedPriority === 'B' ? null : 'B')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-orange-500 text-white text-xs font-bold flex items-center justify-center">B</span>
                  <span className="text-sm font-medium">Priority B Actions ({priorityBActions.length})</span>
                </span>
                {expandedPriority === 'B' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {priorityBActions.map(action => (
                <div key={action.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm flex-1">{action.description}</p>
                    {getStatusBadge(action.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {action.action_owner_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {action.action_owner_name}
                      </span>
                    )}
                    {action.target_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(action.target_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  {action.status !== 'closed' && (
                    <div className="flex gap-2 mt-2">
                      {action.status === 'open' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(action.id, 'in_progress')}
                          disabled={updateActionStatus.isPending}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => handleStatusChange(action.id, 'closed')}
                        disabled={updateActionStatus.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">No priority actions recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
