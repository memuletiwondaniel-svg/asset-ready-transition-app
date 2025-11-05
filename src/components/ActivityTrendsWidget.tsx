import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, FolderOpen } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

interface ActivityData {
  date: string;
  users: number;
  projects: number;
}

const ActivityTrendsWidget: React.FC = () => {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState({ users: 0, projects: 0 });

  useEffect(() => {
    const fetchActivityData = async () => {
      setIsLoading(true);
      try {
        // Get last 7 days data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return startOfDay(date);
        });

        // Fetch user signups for last 7 days
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', last7Days[0].toISOString());

        if (usersError) throw usersError;

        // Fetch project creation for last 7 days
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('created_at')
          .gte('created_at', last7Days[0].toISOString());

        if (projectsError) throw projectsError;

        // Aggregate data by day
        const dataByDay = last7Days.map(date => {
          const dateStr = format(date, 'MMM dd');
          const dayStart = date.toISOString();
          const dayEnd = startOfDay(new Date(date.getTime() + 24 * 60 * 60 * 1000)).toISOString();

          const userCount = users?.filter(u => {
            const createdAt = new Date(u.created_at);
            return createdAt >= date && createdAt < new Date(dayEnd);
          }).length || 0;

          const projectCount = projects?.filter(p => {
            const createdAt = new Date(p.created_at);
            return createdAt >= date && createdAt < new Date(dayEnd);
          }).length || 0;

          return {
            date: dateStr,
            users: userCount,
            projects: projectCount
          };
        });

        setActivityData(dataByDay);
        
        // Calculate totals
        const totalUsers = dataByDay.reduce((sum, day) => sum + day.users, 0);
        const totalProjects = dataByDay.reduce((sum, day) => sum + day.projects, 0);
        setTotals({ users: totalUsers, projects: totalProjects });
      } catch (error) {
        console.error('Error fetching activity data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityData();

    // Set up real-time subscriptions
    const userChannel = supabase
      .channel('activity-trends-users')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchActivityData();
        }
      )
      .subscribe();

    const projectChannel = supabase
      .channel('activity-trends-projects')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects'
        },
        () => {
          fetchActivityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(projectChannel);
    };
  }, []);

  return (
    <Card className="col-span-full border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Activity Trends
            </CardTitle>
            <CardDescription>Last 7 days overview</CardDescription>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <div className="text-sm">
                <p className="text-muted-foreground">User Signups</p>
                <p className="font-bold text-lg">{totals.users}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <div className="text-sm">
                <p className="text-muted-foreground">New Projects</p>
                <p className="font-bold text-lg">{totals.projects}</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading data...</div>
          </div>
        ) : activityData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No activity data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="rgb(59, 130, 246)" 
                strokeWidth={2}
                dot={{ fill: 'rgb(59, 130, 246)', r: 4 }}
                activeDot={{ r: 6 }}
                name="User Signups"
              />
              <Line 
                type="monotone" 
                dataKey="projects" 
                stroke="rgb(249, 115, 22)" 
                strokeWidth={2}
                dot={{ fill: 'rgb(249, 115, 22)', r: 4 }}
                activeDot={{ r: 6 }}
                name="New Projects"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityTrendsWidget;
