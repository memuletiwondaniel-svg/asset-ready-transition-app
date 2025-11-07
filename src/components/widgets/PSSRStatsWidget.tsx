import React, { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PSSRStatsWidgetProps {
  settings: Record<string, any>;
}

export const PSSRStatsWidget: React.FC<PSSRStatsWidgetProps> = ({ settings }) => {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    draft: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Real-time updates
    const channel = supabase
      .channel('pssr-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pssrs'
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pssrs')
        .select('status, approval_status')
        .eq('user_id', user.id);

      if (error) throw error;

      const newStats = {
        total: data?.length || 0,
        completed: data?.filter(p => p.status === 'COMPLETED').length || 0,
        pending: data?.filter(p => p.status === 'PENDING_APPROVAL').length || 0,
        draft: data?.filter(p => p.status === 'DRAFT').length || 0,
        approved: data?.filter(p => p.approval_status === 'APPROVED').length || 0,
        rejected: data?.filter(p => p.approval_status === 'REJECTED').length || 0
      };

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching PSSR stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: 'Completed', value: stats.completed, color: 'hsl(var(--success))' },
    { name: 'Pending', value: stats.pending, color: 'hsl(var(--warning))' },
    { name: 'Draft', value: stats.draft, color: 'hsl(var(--muted))' }
  ];

  const approvalData = [
    { name: 'Approved', value: stats.approved },
    { name: 'Pending', value: stats.pending },
    { name: 'Rejected', value: stats.rejected }
  ];

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          PSSR Statistics
        </CardTitle>
        <CardDescription className="text-xs">Real-time completion and approval status</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-border/40 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Completion Rate</span>
                </div>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <div className="p-3 rounded-lg border border-border/40 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total PSSRs</span>
                </div>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>

            {/* Status Pie Chart */}
            {stats.total > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Status Breakdown</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-xs">
                  {statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval Status Bar Chart */}
            {stats.total > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Approval Status</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={approvalData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {stats.total === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No PSSR data yet</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </>
  );
};
