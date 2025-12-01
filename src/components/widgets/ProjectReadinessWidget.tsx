import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Target, FileText, UserCircle, Building, MapPin, Calendar } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectReadinessWidgetProps {
  projectId: string;
  onViewDetails?: () => void;
}

export const ProjectReadinessWidget: React.FC<ProjectReadinessWidgetProps> = ({ projectId, onViewDetails }) => {
  const { projects } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);

  // Helper function to convert relative avatar paths to full Supabase storage URLs
  const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        // Fetch team members with profile data
        const { data: teamData, error: teamError } = await (supabase as any)
          .from('project_team_members')
          .select('*')
          .eq('project_id', projectId)
          .limit(5);
        
        if (!teamError && teamData) {
          // Fetch profiles for team members
          const userIds = teamData.map((m: any) => m.user_id).filter(Boolean);
          if (userIds.length > 0) {
            const { data: profilesData } = await (supabase as any)
              .from('profiles')
              .select('user_id, full_name, avatar_url, position')
              .in('user_id', userIds);
            
            // Merge team data with profiles
            const enrichedTeamData = teamData.map((member: any) => ({
              ...member,
              profiles: profilesData?.find((p: any) => p.user_id === member.user_id)
            }));
            
            setTeamMembers(enrichedTeamData);
          } else {
            setTeamMembers(teamData);
          }
        }

        // Fetch milestones
        const { data: milestonesData, error: milestonesError } = await (supabase as any)
          .from('project_milestones')
          .select('*')
          .eq('project_id', projectId)
          .order('milestone_date', { ascending: true })
          .limit(5);
        
        if (!milestonesError && milestonesData) {
          setMilestones(milestonesData);
        }
      } catch (error) {
        console.error('Error fetching project data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);


  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:border-primary/30 group">
      <CardHeader className="pb-4 cursor-pointer" onClick={onViewDetails}>
        <CardTitle className="text-lg hover:text-primary transition-colors mb-4">
          Project Overview
        </CardTitle>
        
        {/* Project Key Info Banner */}
        {project && (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Plant:</span>
                    <span className="font-medium truncate">{plant?.name || 'N/A'}</span>
                  </div>
                  {station && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Station:</span>
                      <span className="font-medium truncate">{station.name}</span>
                    </div>
                  )}
                  {hub && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Hub:</span>
                      <span className="font-medium truncate">{hub.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {/* Project Scope */}
            {project?.project_scope && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Project Scope
                </h3>
                <div className="pl-6 space-y-2">
                  <p className={`text-sm text-foreground/90 ${!isScopeExpanded ? 'line-clamp-6' : ''}`}>
                    {project.project_scope}
                  </p>
                  {project.project_scope.length > 300 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsScopeExpanded(!isScopeExpanded);
                      }}
                    >
                      {isScopeExpanded ? 'Show Less' : 'Read More'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Project Image */}
            {project?.project_scope_image_url && (
              <div className="space-y-3">
                <div 
                  className="relative rounded-xl overflow-hidden border border-primary/20 shadow-lg cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                  onClick={onViewDetails}
                >
                  <img 
                    src={project.project_scope_image_url} 
                    alt={project.project_title}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            )}

            {/* Team Members */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members {teamMembers.length > 0 && `(${teamMembers.length})`}
              </h3>
              <div className="space-y-2 pl-6">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No team members assigned</p>
                ) : (
                  teamMembers.map((member) => {
                    const profile = member.profiles;
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <Avatar className="h-8 w-8">
                          {profile?.avatar_url ? (
                            <AvatarImage src={getAvatarUrl(profile.avatar_url)} alt={profile?.full_name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              <UserCircle className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{profile?.full_name || 'Unassigned'}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.role || 'No role'}</p>
                        </div>
                        {member.is_lead && (
                          <Badge className="text-xs" variant="outline">Lead</Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Milestones {milestones.length > 0 && `(${milestones.length})`}
              </h3>
              <div className="space-y-2 pl-6">
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No milestones defined</p>
                ) : (
                  milestones.map((milestone) => (
                    <div key={milestone.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{milestone.milestone_name}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getMilestoneStatusColor(milestone.status)}`}
                        >
                          {milestone.status || 'pending'}
                        </Badge>
                      </div>
                      {milestone.milestone_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(milestone.milestone_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
