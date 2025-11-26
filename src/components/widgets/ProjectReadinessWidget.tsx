import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Users, Target, FileText, UserCircle, Building, MapPin, Calendar, Edit } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectReadinessWidgetProps {
  projectId: string;
  onEditProject: () => void;
}

export const ProjectReadinessWidget: React.FC<ProjectReadinessWidgetProps> = ({ projectId, onEditProject }) => {
  const { projects } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const project = projects.find(p => p.id === projectId);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        // Fetch team members
        const { data: teamData, error: teamError } = await (supabase as any)
          .from('project_team_members')
          .select('*')
          .eq('project_id', projectId)
          .limit(5);
        
        if (!teamError && teamData) {
          setTeamMembers(teamData);
        }

        // Fetch milestones
        const { data: milestonesData, error: milestonesError } = await (supabase as any)
          .from('project_milestones')
          .select('*')
          .eq('project_id', projectId)
          .order('target_date', { ascending: true })
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

  // Mock readiness data - replace with actual calculation
  const readinessData = {
    overall: 75,
    categories: [
      { name: 'Documentation', progress: 80, status: 'on-track' },
      { name: 'Resources', progress: 70, status: 'on-track' },
      { name: 'Equipment', progress: 85, status: 'on-track' },
      { name: 'Safety', progress: 65, status: 'at-risk' }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'at-risk':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

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
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:border-primary/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Project Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg font-bold">
              {readinessData.overall}%
            </Badge>
            <Button onClick={onEditProject} size="sm" variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {/* Project Info */}
            {project && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Project Information
                </h3>
                <div className="space-y-2 pl-6">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Plant:</span>
                      <p className="font-medium">{plant?.name || 'N/A'}</p>
                    </div>
                    {station && (
                      <div>
                        <span className="text-muted-foreground">Station:</span>
                        <p className="font-medium">{station.name}</p>
                      </div>
                    )}
                    {hub && (
                      <div>
                        <span className="text-muted-foreground">Hub:</span>
                        <p className="font-medium">{hub.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Project Scope */}
            {project?.project_scope && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Project Scope
                </h3>
                <div className="pl-6">
                  <p className="text-sm text-foreground/90 line-clamp-4">
                    {project.project_scope}
                  </p>
                </div>
              </div>
            )}

            {/* Readiness Status */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Readiness Status
              </h3>
              <div className="space-y-3 pl-6">
                {readinessData.categories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(category.status)}
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-muted-foreground">{category.progress}%</span>
                    </div>
                    <Progress value={category.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

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
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Avatar className="h-8 w-8">
                        {member.avatar_url ? (
                          <AvatarImage src={member.avatar_url} alt={member.user_name} />
                        ) : (
                          <AvatarFallback className="bg-primary/10">
                            <UserCircle className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.user_name || 'Unassigned'}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.position || 'No position'}</p>
                      </div>
                      {member.is_lead && (
                        <Badge className="text-xs" variant="outline">Lead</Badge>
                      )}
                    </div>
                  ))
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
                      {milestone.target_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(milestone.target_date).toLocaleDateString()}</span>
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
