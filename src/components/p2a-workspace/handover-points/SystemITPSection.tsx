import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { useSystemITPActivities, SystemITPActivity } from '../hooks/useSystemITPActivities';
import { cn } from '@/lib/utils';

interface SystemITPSectionProps {
  handoverPointId: string;
  systemId: string;
}

const getITPStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        classes: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      };
    default:
      return {
        label: 'Not Started',
        classes: 'bg-muted text-muted-foreground border-border',
      };
  }
};

const getInspectionTypeBadge = (type: string) => {
  if (type === 'H') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/15 text-red-500 text-[9px] font-bold border border-red-500/30">
        H
      </span>
    );
  }
  if (type === 'W') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 text-[9px] font-bold border border-blue-500/30">
        W
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold border border-border">
      —
    </span>
  );
};

export const SystemITPSection: React.FC<SystemITPSectionProps> = ({
  handoverPointId,
  systemId,
}) => {
  const { activities, isLoading } = useSystemITPActivities(handoverPointId, systemId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">ITP Activities</div>
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">ITP Activities</div>
        <div className="flex items-center gap-2 text-center py-4 text-sm text-muted-foreground justify-center">
          <ClipboardList className="w-4 h-4" />
          No ITP activities defined
        </div>
      </div>
    );
  }

  const completed = activities.filter(a => a.ora_status === 'COMPLETED').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">ITP Activities</div>
        <span className="text-[10px] text-muted-foreground">
          {completed}/{activities.length} completed
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-3 py-1.5 w-8">Type</th>
              <th className="text-left px-3 py-1.5">Activity</th>
              <th className="text-right px-3 py-1.5 w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => {
              const statusConfig = getITPStatusConfig(activity.ora_status);
              return (
                <tr key={activity.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-1.5">
                    {getInspectionTypeBadge(activity.inspection_type)}
                  </td>
                  <td className="px-3 py-1.5 text-foreground text-xs">
                    {activity.activity_name}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] px-1.5 py-0', statusConfig.classes)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
