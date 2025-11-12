import React from 'react';
import { useP2AHandovers } from '@/hooks/useP2AHandovers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const P2AAnalyticsDashboard: React.FC = () => {
  const { handovers, isLoading } = useP2AHandovers();

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  // Calculate metrics
  const totalHandovers = handovers?.length || 0;
  const completedHandovers = handovers?.filter(h => h.status === 'COMPLETED').length || 0;
  const inProgressHandovers = handovers?.filter(h => h.status === 'IN_PROGRESS').length || 0;
  const completionRate = totalHandovers > 0 ? Math.round((completedHandovers / totalHandovers) * 100) : 0;

  // Status distribution data
  const statusData = [
    { name: 'Draft', value: handovers?.filter(h => h.status === 'DRAFT').length || 0, color: COLORS[0] },
    { name: 'In Progress', value: inProgressHandovers, color: COLORS[1] },
    { name: 'Cancelled', value: handovers?.filter(h => h.status === 'CANCELLED').length || 0, color: COLORS[2] },
    { name: 'Completed', value: completedHandovers, color: COLORS[3] }
  ].filter(item => item.value > 0);

  // Phase distribution
  const phaseData = [
    { name: 'PAC', value: handovers?.filter(h => h.phase === 'PAC').length || 0 },
    { name: 'FAC', value: handovers?.filter(h => h.phase === 'FAC').length || 0 }
  ];

  // Timeline data (mock - in real scenario would come from dates)
  const timelineData = handovers?.slice(0, 10).map((h, idx) => ({
    name: h.project?.project_id_number || `Project ${idx + 1}`,
    progress: h.status === 'COMPLETED' ? 100 : h.status === 'IN_PROGRESS' ? 65 : 30,
    phase: h.phase
  })) || [];

  // Deliverable statistics - placeholder for now
  const totalDeliverables = 0;
  const completedDeliverables = 0;

  const stats = [
    {
      label: 'Total Handovers',
      value: totalHandovers,
      icon: TrendingUp,
      color: 'text-blue-500'
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      label: 'In Progress',
      value: inProgressHandovers,
      icon: Clock,
      color: 'text-amber-500'
    },
    {
      label: 'Total Deliverables',
      value: totalDeliverables,
      icon: AlertCircle,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Handover Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

        {/* Phase Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Handover Phase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Handover Progress Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="progress" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Handover List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Handovers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {handovers?.slice(0, 5).map((handover) => (
              <div key={handover.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold">{handover.project?.project_title || 'Untitled Project'}</p>
                  <p className="text-sm text-muted-foreground">
                    {handover.project?.project_id_prefix}-{handover.project?.project_id_number}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{handover.phase}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    handover.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                    handover.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-gray-500/10 text-gray-500'
                  }`}>
                    {handover.status}
                  </span>
                  <div className="text-sm text-muted-foreground">
                    0 deliverables
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
