import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ORMResourceUtilizationWidget: React.FC = () => {
  const navigate = useNavigate();

  const { data: utilization, isLoading } = useQuery({
    queryKey: ['orm-resource-utilization-widget'],
    queryFn: async () => {
      const { data: deliverables, error } = await supabase
        .from('orm_deliverables')
        .select('assigned_resource_id, progress_percentage')
        .not('assigned_resource_id', 'is', null);

      if (error) throw error;

      // Aggregate by resource id
      const resourceMap = new Map<string, { count: number; totalProgress: number }>();
      (deliverables || []).forEach((del: any) => {
        const userId = del.assigned_resource_id;
        if (!userId) return;
        if (!resourceMap.has(userId)) {
          resourceMap.set(userId, { count: 0, totalProgress: 0 });
        }
        const res = resourceMap.get(userId)!;
        res.count++;
        res.totalProgress += del.progress_percentage || 0;
      });

      const ids = Array.from(resourceMap.keys());
      let nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', ids);
        (profilesData || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name));
      }

      const resources = ids.map((userId) => {
        const data = resourceMap.get(userId)!;
        return {
          userId,
          name: nameMap.get(userId) || 'Unassigned',
          deliverables: data.count,
          avgProgress: data.count ? Math.round(data.totalProgress / data.count) : 0,
        };
      }).sort((a, b) => b.deliverables - a.deliverables);

      const avgUtilization = resources.length > 0
        ? Math.round(resources.reduce((sum, r) => sum + r.avgProgress, 0) / resources.length)
        : 0;

      return { resources: resources.slice(0, 5), avgUtilization, totalResources: resources.length };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/or-maintenance/resources')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">ORM Resource Utilization</CardTitle>
        <Users className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Utilization</span>
              <span className="text-2xl font-bold">{utilization?.avgUtilization || 0}%</span>
            </div>
            <Progress value={utilization?.avgUtilization || 0} className="h-2" />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Top Resources:</p>
            {utilization?.resources && utilization.resources.length > 0 ? (
              utilization.resources.map((resource: any) => (
                <div key={resource.userId} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{resource.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{resource.deliverables} items</span>
                    <span className="text-xs font-medium">{resource.avgProgress}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No active resources</p>
            )}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Resources</span>
              <span className="font-medium">{utilization?.totalResources || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
