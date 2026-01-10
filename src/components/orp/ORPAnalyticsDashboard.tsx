import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ORPAnalyticsDashboard: React.FC = () => {
  const { data: plans } = useQuery({
    queryKey: ['orp-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number),
          deliverables:orp_plan_deliverables(*),
          resources:orp_resources(*),
          approvals:orp_approvals(*)
        `)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const totalPlans = plans?.length || 0;
  const totalDeliverables = plans?.reduce((acc, p) => acc + (p.deliverables?.length || 0), 0) || 0;
  const completedDeliverables = plans?.reduce((acc, p) => 
    acc + (p.deliverables?.filter((d: any) => d.status === 'COMPLETED').length || 0), 0) || 0;
  const totalResources = plans?.reduce((acc, p) => acc + (p.resources?.length || 0), 0) || 0;
  
  const completionRate = totalDeliverables > 0 ? (completedDeliverables / totalDeliverables) * 100 : 0;

  // Status distribution
  const statusData = [
    { name: 'Not Started', value: plans?.reduce((acc, p) => 
      acc + (p.deliverables?.filter((d: any) => d.status === 'NOT_STARTED').length || 0), 0) || 0, color: '#64748b' },
    { name: 'In Progress', value: plans?.reduce((acc, p) => 
      acc + (p.deliverables?.filter((d: any) => d.status === 'IN_PROGRESS').length || 0), 0) || 0, color: '#f59e0b' },
    { name: 'Completed', value: completedDeliverables, color: '#22c55e' },
    { name: 'On Hold', value: plans?.reduce((acc, p) => 
      acc + (p.deliverables?.filter((d: any) => d.status === 'ON_HOLD').length || 0), 0) || 0, color: '#ef4444' }
  ];

  // Phase distribution
  const phaseData = [
    { phase: 'Assess & Select', count: plans?.filter(p => p.phase === 'ASSESS_SELECT').length || 0 },
    { phase: 'Define', count: plans?.filter(p => p.phase === 'DEFINE').length || 0 },
    { phase: 'Execute', count: plans?.filter(p => p.phase === 'EXECUTE').length || 0 }
  ];

  // Approval status
  const pendingApprovals = plans?.reduce((acc, p) => 
    acc + (p.approvals?.filter((a: any) => a.status === 'PENDING').length || 0), 0) || 0;
  const approvedCount = plans?.reduce((acc, p) => 
    acc + (p.approvals?.filter((a: any) => a.status === 'APPROVED').length || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total ORA Plans</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlans}</div>
            <p className="text-xs text-muted-foreground mt-1">Active plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResources}</div>
            <p className="text-xs text-muted-foreground mt-1">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Deliverable Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ORA Plans by Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phase" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ORP List */}
      <Card>
        <CardHeader>
          <CardTitle>ORA Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans?.map((plan) => {
              const planDeliverables = plan.deliverables || [];
              const planCompleted = planDeliverables.filter((d: any) => d.status === 'COMPLETED').length;
              const planTotal = planDeliverables.length;
              const planProgress = planTotal > 0 ? (planCompleted / planTotal) * 100 : 0;

              return (
                <div key={plan.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{plan.project?.project_title || 'Untitled'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{plan.phase.replace('_', ' & ')}</Badge>
                        <Badge>{plan.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {planCompleted} / {planTotal} Deliverables
                      </p>
                    </div>
                  </div>
                  <Progress value={planProgress} className="mt-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
