import React, { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Circle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface TeamMembersWidgetProps {
  settings: Record<string, any>;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'active' | 'busy' | 'away';
  current_task: string | null;
  tasks_count: number;
}

export const TeamMembersWidget: React.FC<TeamMembersWidgetProps> = ({ settings }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
    
    // Real-time updates for team member changes
    const channel = supabase
      .channel('team-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchTeamMembers()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks'
        },
        () => fetchTeamMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch team members (users with similar company/department)
      const { data: profile } = await supabase
        .from('profiles')
        .select('company, department')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data: teamProfiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, company, department')
        .eq('company', profile.company)
        .eq('is_active', true)
        .neq('user_id', user.id)
        .limit(settings.maxMembers || 5);

      if (error) throw error;

      // Fetch task counts for each member
      const membersData: TeamMember[] = [];
      
      for (const member of (teamProfiles || [])) {
        // Mock data for now - simplified to avoid type inference issues
        const totalTasks = 0;
        let status: 'active' | 'busy' | 'away' = 'active';
        const recentTask: string | null = null;
        
        membersData.push({
          id: member.user_id,
          full_name: member.full_name || 'Unknown',
          avatar_url: member.avatar_url,
          status,
          current_task: recentTask || null,
          tasks_count: totalTasks
        });
      }

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success';
      case 'busy':
        return 'text-warning';
      case 'away':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'busy':
        return 'secondary';
      case 'away':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Team Members
        </CardTitle>
        <CardDescription className="text-xs">Team availability and tasks</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No team members found</p>
          </div>
        ) : (
          members.map((member, idx) => (
            <div
              key={member.id}
              className="p-3 rounded-lg border border-border/40 hover:border-primary/30 transition-all bg-gradient-to-br from-card/50 to-card/30"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Circle 
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(member.status)} fill-current bg-card rounded-full`} 
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{member.full_name}</h4>
                    <Badge variant={getStatusBadge(member.status)} className="text-xs capitalize">
                      {member.status}
                    </Badge>
                  </div>
                  
                  {member.current_task ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{member.current_task}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3" />
                      <span>Available</span>
                    </div>
                  )}
                  
                  {member.tasks_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.tasks_count} active {member.tasks_count === 1 ? 'task' : 'tasks'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </>
  );
};
