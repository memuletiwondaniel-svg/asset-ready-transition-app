import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, ArrowLeft, TrendingUp, CheckCircle } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ORMResourceCapacityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'OR Maintenance', path: '/or-maintenance' },
      { label: 'Resource Capacity', path: '/or-maintenance/resources' }
    ]);
  }, [setBreadcrumbs]);

  const { data: resourceData, isLoading } = useQuery({
    queryKey: ['orm-resource-capacity'],
    queryFn: async () => {
      // Get all deliverables with assigned resources
      const { data: deliverables, error: delError } = await supabase
        .from('orm_deliverables')
        .select(`
          *,
          orm_plan:orm_plans(
            project:projects(project_title)
          )
        `)
        .not('assigned_resource_id', 'is', null);

      if (delError) throw delError;

      // Get all tasks
      const { data: allTasks, error: taskError } = await supabase
        .from('orm_tasks')
        .select('*');

      if (taskError) throw taskError;

      // Fetch all unique user profiles
      const userIds = new Set<string>();
      deliverables?.forEach((d: any) => {
        if (d.assigned_resource_id) userIds.add(d.assigned_resource_id);
      });
      allTasks?.forEach((t: any) => {
        if (t.assigned_to) userIds.add(t.assigned_to);
      });

      let profilesMap = new Map<string, any>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, email')
          .in('user_id', Array.from(userIds));
        
        profiles?.forEach(p => profilesMap.set(p.user_id, p));
      }

      // Attach profiles to deliverables
      deliverables?.forEach((d: any) => {
        d.assigned_resource = d.assigned_resource_id ? profilesMap.get(d.assigned_resource_id) : null;
      });

      // Attach profiles to tasks
      allTasks?.forEach((t: any) => {
        t.assigned_user = t.assigned_to ? profilesMap.get(t.assigned_to) : null;
      });

      return { deliverables, allTasks };
    }
  });

  // Calculate resource workload
  const resourceWorkload = React.useMemo(() => {
    if (!resourceData?.deliverables) return [];

    const workloadMap = new Map<string, {
      user_id: string;
      full_name: string;
      avatar_url: string;
      email: string;
      deliverables: number;
      inProgressDeliverables: number;
      completedDeliverables: number;
      tasks: number;
      pendingTasks: number;
      completedTasks: number;
      avgProgress: number;
    }>();

    // Process deliverables
    resourceData.deliverables.forEach((del: any) => {
      const resource = del.assigned_resource;
      if (!resource) return;

      if (!workloadMap.has(resource.user_id)) {
        workloadMap.set(resource.user_id, {
          user_id: resource.user_id,
          full_name: resource.full_name,
          avatar_url: resource.avatar_url,
          email: resource.email,
          deliverables: 0,
          inProgressDeliverables: 0,
          completedDeliverables: 0,
          tasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          avgProgress: 0
        });
      }

      const workload = workloadMap.get(resource.user_id)!;
      workload.deliverables++;
      if (del.workflow_stage === 'APPROVED') {
        workload.completedDeliverables++;
      } else {
        workload.inProgressDeliverables++;
      }
      workload.avgProgress += del.progress_percentage || 0;
    });

    // Process tasks
    resourceData.allTasks?.forEach((task: any) => {
      const userId = task.assigned_to;
      if (!userId) return;

      const workload = workloadMap.get(userId);
      if (workload) {
        workload.tasks++;
        if (task.status === 'COMPLETED') {
          workload.completedTasks++;
        } else {
          workload.pendingTasks++;
        }
      }
    });

    // Calculate averages
    workloadMap.forEach((workload) => {
      if (workload.deliverables > 0) {
        workload.avgProgress = Math.round(workload.avgProgress / workload.deliverables);
      }
    });

    return Array.from(workloadMap.values()).sort((a, b) => b.deliverables - a.deliverables);
  }, [resourceData]);

  const totalResources = resourceWorkload.length;
  const totalActiveDeliverables = resourceWorkload.reduce((sum, r) => sum + r.inProgressDeliverables, 0);
  const avgResourceUtilization = resourceWorkload.length > 0
    ? Math.round(resourceWorkload.reduce((sum, r) => sum + r.avgProgress, 0) / resourceWorkload.length)
    : 0;

  const chartData = resourceWorkload.slice(0, 10).map(r => ({
    name: r.full_name.split(' ')[0],
    deliverables: r.deliverables,
    tasks: r.tasks
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <OrshSidebar
        currentPage="or-maintenance"
        onNavigate={(section) => {
          if (section === 'home') navigate('/');
          else if (section === 'or-maintenance') navigate('/or-maintenance');
          else navigate(`/${section}`);
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card px-6 py-4">
          <BreadcrumbNavigation currentPageLabel="Resource Capacity" />
          <div className="flex items-center gap-4 mt-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/or-maintenance')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Resource Capacity Dashboard</h1>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalResources}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Deliverables</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalActiveDeliverables}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgResourceUtilization}%</div>
                <Progress value={avgResourceUtilization} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="deliverables" fill="hsl(var(--primary))" name="Deliverables" />
                    <Bar dataKey="tasks" fill="hsl(var(--secondary))" name="Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[300px] overflow-auto">
                  {resourceWorkload.map((resource) => (
                    <div key={resource.user_id} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={resource.avatar_url} />
                        <AvatarFallback>
                          {resource.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{resource.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {resource.deliverables} deliverables
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {resource.tasks} tasks
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{resource.avgProgress}%</div>
                        <Progress value={resource.avgProgress} className="w-20 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Resource Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resourceWorkload.map((resource) => (
                  <Card key={resource.user_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={resource.avatar_url} />
                          <AvatarFallback>
                            {resource.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{resource.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{resource.email}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Total Deliverables</p>
                              <p className="text-lg font-bold">{resource.deliverables}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">In Progress</p>
                              <p className="text-lg font-bold text-blue-600">{resource.inProgressDeliverables}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Completed</p>
                              <p className="text-lg font-bold text-green-600">{resource.completedDeliverables}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Avg Progress</p>
                              <p className="text-lg font-bold">{resource.avgProgress}%</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Total Tasks</p>
                              <p className="text-lg font-bold">{resource.tasks}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Pending Tasks</p>
                              <p className="text-lg font-bold text-yellow-600">{resource.pendingTasks}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Completed Tasks</p>
                              <p className="text-lg font-bold text-green-600">{resource.completedTasks}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
