import React from 'react';
import { useORPPlans } from '@/hooks/useORPPlans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarCheck, Calendar, User } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { format } from 'date-fns';

interface ORPListWidgetProps {
  onSelectORP: (id: string) => void;
}

export const ORPListWidget: React.FC<ORPListWidgetProps> = ({ onSelectORP }) => {
  const { plans, isLoading } = useORPPlans();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'PENDING_APPROVAL': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'APPROVED': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'COMPLETED': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'ASSESS_SELECT': return 'Assess & Select';
      case 'DEFINE': return 'Define';
      case 'EXECUTE': return 'Execute';
      default: return phase;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            ORA Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5" />
          ORA Plans
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!plans || plans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No ORA plans created yet</p>
            <p className="text-sm mt-2">Click "Create New ORA" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => onSelectORP(plan.id)}
                className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {plan.project?.project_title || 'Untitled Project'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.project?.project_id_prefix}-{plan.project?.project_id_number}
                    </p>
                  </div>
                  <Badge className={getStatusColor(plan.status)}>
                    {plan.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                  <div className="flex items-center gap-1">
                    <CalendarCheck className="w-4 h-4" />
                    <span>{getPhaseLabel(plan.phase)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{plan.ora_engineer?.full_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(plan.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
