import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Target, FileText, UserCircle, Building2 } from 'lucide-react';
import { useProjects, useProjectTeamMembers } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useAutoPopulateTeam } from '@/hooks/useAutoPopulateTeam';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { MilestonesTimeline } from './MilestonesTimeline';

interface ProjectReadinessWidgetProps {
  projectId: string;
  onViewDetails?: () => void;
}

export const ProjectReadinessWidget: React.FC<ProjectReadinessWidgetProps> = ({ projectId, onViewDetails }) => {
  const { projects } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();
  const { regions } = useProjectRegions();
  
  // Use react-query hook for team members - automatically refetches when cache is invalidated
  const { teamMembers: rawTeamMembers, isLoading: teamLoading, addTeamMember } = useProjectTeamMembers(projectId);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);
  const hasAutoHealed = useRef(false);

  const project = projects.find(p => p.id === projectId);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);
  const region = regions.find(r => r.id === project?.region_id);

  // Auto-populate suggestions for missing roles
  const { suggestedTeam, isLoading: suggestionsLoading } = useAutoPopulateTeam(
    region?.name || null,
    hub?.name || null,
    project?.hub_id || null
  );

  // Transform team members to include profiles data structure expected by display logic
  const teamMembers = rawTeamMembers.map(member => ({
    ...member,
    profiles: {
      full_name: member.user_name,
      avatar_url: member.avatar_url,
    }
  }));

  // Self-healing: auto-fill missing required roles from region/hub-based suggestions
  const REQUIRED_ROLES = ['Project Hub Lead', 'Construction Lead', 'Commissioning Lead', 'Snr. ORA Engr.'];
  
  useEffect(() => {
    if (teamLoading || suggestionsLoading || hasAutoHealed.current || !projectId) return;
    if (suggestedTeam.length === 0) return;

    const missingRoles = REQUIRED_ROLES.filter(role => {
      const roleVariations: Record<string, string[]> = {
        'Project Hub Lead': ['Project Hub Lead'],
        'Construction Lead': ['Construction Lead'],
        'Commissioning Lead': ['Commissioning Lead'],
        'Snr. ORA Engr.': ['Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
      };
      const variations = roleVariations[role] || [role];
      return !rawTeamMembers.some(m => variations.includes(m.role));
    });

    if (missingRoles.length === 0) {
      hasAutoHealed.current = true;
      return;
    }

    // Find suggested users for the missing roles and auto-insert them
    hasAutoHealed.current = true;
    missingRoles.forEach(role => {
      const suggestion = suggestedTeam.find(s => s.role === role);
      if (suggestion) {
        addTeamMember({
          project_id: projectId,
          user_id: suggestion.user_id,
          role: role,
          is_lead: role === 'Project Hub Lead',
        });
      }
    });
  }, [teamLoading, suggestionsLoading, rawTeamMembers, suggestedTeam, projectId]);

  // Helper function to convert relative avatar paths to full Supabase storage URLs
  const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  // Fetch milestones only (team members now use react-query)
  useEffect(() => {
    const fetchMilestones = async () => {
      if (!projectId) return;
      
      setMilestonesLoading(true);
      try {
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
        console.error('Error fetching milestones:', error);
      } finally {
        setMilestonesLoading(false);
      }
    };

    fetchMilestones();
  }, [projectId]);

  const loading = teamLoading || milestonesLoading;


  if (loading) {
    return (
      <Card className="h-full glass-card">
        <CardHeader className="pb-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-6 w-48 mt-3" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col glass-card glass-card-hover overflow-hidden group">
      {/* Hero Header */}
      <CardHeader className="pb-3 cursor-pointer relative overflow-hidden" onClick={onViewDetails}>
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
        
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          {/* Icon and Title Row */}
          <div className="flex items-center gap-3 mb-4">
            <StyledWidgetIcon 
              Icon={Building2}
              gradientFrom="from-blue-500"
              gradientTo="to-cyan-500"
              glowFrom="from-blue-500/40"
              glowTo="to-cyan-500/40"
            />
            <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Project Overview
            </span>
          </div>
          
          {/* Location Labels */}
          {project && (plant || station) && (
            <p className="text-xs text-muted-foreground">
              {[plant?.name, station?.name].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden pt-0">
        <ScrollArea className="h-full pr-4 overscroll-contain">
          <div className="space-y-6">
            {/* Project Scope */}
            {project?.project_scope && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  Project Scope
                </h3>
                <div className="pl-1 space-y-2">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                    <p className={`text-xs text-foreground/90 leading-relaxed ${!isScopeExpanded ? 'line-clamp-4' : ''}`}>
                      {project.project_scope}
                    </p>
                    {project.project_scope.length > 200 && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-primary mt-2"
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
              </div>
            )}

            {/* Project Image */}
            {project?.project_scope_image_url && (
              <div className="space-y-3">
                <div 
                  className="relative rounded-xl overflow-hidden border border-border/40 shadow-lg cursor-pointer group/image"
                  onClick={onViewDetails}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity z-10" />
                  <img 
                    src={project.project_scope_image_url} 
                    alt={project.project_title}
                    className="w-full h-48 object-cover group-hover/image:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            )}

            {/* Team Members - Required Roles Only */}
            {(() => {
              // Canonical required roles that should always appear
              const CANONICAL_REQUIRED_ROLES = [
                'Project Hub Lead',
                'Construction Lead',
                'Commissioning Lead',
                'Snr. ORA Engr.',
              ];
              
              // Variations for matching existing team members
              const ROLE_VARIATIONS: Record<string, string[]> = {
                'Project Hub Lead': ['Project Hub Lead'],
                'Construction Lead': ['Construction Lead'],
                'Commissioning Lead': ['Commissioning Lead'],
                'Snr. ORA Engr.': ['Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'],
              };
              
              // Build display data - always show all 4 roles
              const roleDisplayData = CANONICAL_REQUIRED_ROLES.map(role => {
                const variations = ROLE_VARIATIONS[role];
                const assignedMember = teamMembers.find(member => variations.includes(member.role));
                return {
                  role,
                  member: assignedMember || null,
                  profile: assignedMember?.profiles || null,
                };
              });
              
              const assignedCount = roleDisplayData.filter(r => r.member).length;
              
              return (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-500/10">
                      <Users className="h-4 w-4 text-violet-600" />
                    </div>
                    Team Members
                    <Badge variant="secondary" className="ml-auto text-xs font-medium">
                      {assignedCount}/{CANONICAL_REQUIRED_ROLES.length}
                    </Badge>
                  </h3>
                  <div className="space-y-2 pl-1">
                    {roleDisplayData.map((data, index) => (
                      <div 
                        key={data.role} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                          data.member 
                            ? "bg-muted/30 border-border/40 hover:bg-muted/50 hover:border-primary/20" 
                            : "bg-muted/10 border-dashed border-border/30"
                        )}
                      >
                        <Avatar className={cn(
                          "h-10 w-10 ring-2 ring-background shadow-md",
                          data.member?.is_lead && "ring-primary/30"
                        )}>
                          {data.profile?.avatar_url ? (
                            <AvatarImage src={getAvatarUrl(data.profile.avatar_url)} alt={data.profile?.full_name} />
                          ) : (
                            <AvatarFallback className={cn(
                              "text-sm font-medium",
                              data.member ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {data.profile?.full_name 
                                ? data.profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                                : <UserCircle className="h-5 w-5" />
                              }
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !data.member && "text-muted-foreground/60 italic"
                          )}>
                            {data.profile?.full_name || 'Unassigned'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{data.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Milestones Timeline */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10">
                  <Target className="h-4 w-4 text-rose-600" />
                </div>
                Milestones
                {milestones.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs font-medium">
                    {milestones.filter(m => m.status === 'completed').length}/{milestones.length}
                  </Badge>
                )}
              </h3>
              <div className="pl-1">
                <MilestonesTimeline milestones={milestones} />
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
