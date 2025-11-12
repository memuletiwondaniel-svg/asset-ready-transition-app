import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OrshSidebar } from '@/components/OrshSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, ArrowLeft, TrendingUp, Users, CheckCircle, Clock, Download } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { exportToExcel, exportToPDF } from '@/utils/ormExport';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const ORMAnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'OR Maintenance', path: '/or-maintenance' },
      { label: 'Analytics', path: '/or-maintenance/analytics' }
    ]);
  }, [setBreadcrumbs]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['orm-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number),
          deliverables:orm_deliverables(
            id,
            deliverable_type,
            workflow_stage,
            progress_percentage,
            assigned_resource_id
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Fetch profiles for assigned resources separately
      const resourceIds = new Set<string>();
      data?.forEach(p => {
        p.deliverables?.forEach((d: any) => {
          if (d.assigned_resource_id) resourceIds.add(d.assigned_resource_id);
        });
      });

      let profilesMap = new Map<string, any>();
      if (resourceIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', Array.from(resourceIds));
        
        profiles?.forEach(p => profilesMap.set(p.user_id, p));
      }

      // Attach profile data to deliverables
      data?.forEach(p => {
        p.deliverables?.forEach((d: any) => {
          d.assigned_resource = d.assigned_resource_id ? profilesMap.get(d.assigned_resource_id) : null;
        });
      });

      return data;
    }
  });

  const totalPlans = plans?.length || 0;
  const totalDeliverables = plans?.reduce((acc, p) => acc + (p.deliverables?.length || 0), 0) || 0;
  const completedDeliverables = plans?.reduce((acc, p) => 
    acc + (p.deliverables?.filter((d: any) => d.workflow_stage === 'APPROVED').length || 0), 0
  ) || 0;
  const avgProgress = plans?.reduce((acc, p) => 
    acc + (p.deliverables?.reduce((sum: number, d: any) => sum + (d.progress_percentage || 0), 0) / (p.deliverables?.length || 1)), 0
  ) / (plans?.length || 1) || 0;

  // Deliverable type distribution
  const deliverableTypes: Record<string, number> = {};
  plans?.forEach(p => {
    p.deliverables?.forEach((d: any) => {
      deliverableTypes[d.deliverable_type] = (deliverableTypes[d.deliverable_type] || 0) + 1;
    });
  });

  const typeData = Object.entries(deliverableTypes).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value
  }));

  // Workflow stage distribution
  const stageData = [
    { name: 'In Progress', value: 0 },
    { name: 'QA/QC Review', value: 0 },
    { name: 'Lead Review', value: 0 },
    { name: 'Central Team', value: 0 },
    { name: 'Approved', value: 0 }
  ];

  plans?.forEach(p => {
    p.deliverables?.forEach((d: any) => {
      if (d.workflow_stage === 'IN_PROGRESS') stageData[0].value++;
      else if (d.workflow_stage === 'QAQC_REVIEW') stageData[1].value++;
      else if (d.workflow_stage === 'LEAD_REVIEW') stageData[2].value++;
      else if (d.workflow_stage === 'CENTRAL_TEAM_REVIEW') stageData[3].value++;
      else if (d.workflow_stage === 'APPROVED') stageData[4].value++;
    });
  });

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
          <BreadcrumbNavigation currentPageLabel="Analytics" />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/or-maintenance')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">OR Maintenance Analytics</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToExcel(plans || [], 'orm-analytics')}>
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPDF(plans || [], 'orm-analytics')}>
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total ORM Plans</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPlans}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(avgProgress)}%</div>
                <Progress value={avgProgress} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deliverables</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDeliverables}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedDeliverables}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0}% completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Deliverables by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Stage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Projects Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plans?.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => navigate(`/or-maintenance/${plan.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{(plan.project as any)?.project_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.deliverables?.length || 0} deliverables
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress 
                          value={plan.deliverables?.reduce((sum: number, d: any) => 
                            sum + (d.progress_percentage || 0), 0) / (plan.deliverables?.length || 1)
                          } 
                        />
                      </div>
                      <Badge variant={plan.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {plan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
