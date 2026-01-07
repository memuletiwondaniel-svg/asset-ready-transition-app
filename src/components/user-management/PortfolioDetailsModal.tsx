import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Users, 
  Building2, 
  FolderKanban, 
  Calendar, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { usePortfolioDetails } from '@/hooks/usePortfolioDetails';
import { RegionWithHubs, HubWithProjects } from '@/hooks/useProjectHierarchy';

interface PortfolioDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'portfolio' | 'hub';
  portfolio?: RegionWithHubs | null;
  hub?: HubWithProjects | null;
  portfolioName?: string;
}

export const PortfolioDetailsModal: React.FC<PortfolioDetailsModalProps> = ({
  open,
  onOpenChange,
  type,
  portfolio,
  hub,
  portfolioName
}) => {
  const regionName = type === 'portfolio' ? portfolio?.name : portfolioName;
  const hubName = type === 'hub' ? hub?.name : null;

  const { categorizedUsers, projects, milestones, isLoading } = usePortfolioDetails(
    regionName || null,
    hubName || null
  );

  const title = type === 'portfolio' 
    ? `${portfolio?.name} Portfolio Details`
    : `${hub?.name} Hub Details`;

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'complete':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'in progress':
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'pending':
      case 'not started':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'overdue':
      case 'delayed':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'complete':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'in progress':
      case 'in_progress':
        return <Clock className="h-3 w-3" />;
      case 'overdue':
      case 'delayed':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Group projects by hub
  const projectsByHub = new Map<string, typeof projects>();
  if (type === 'portfolio' && portfolio) {
    portfolio.hubs.forEach(h => {
      const hubProjects = projects?.filter(p => p.hub_id === h.id) || [];
      if (hubProjects.length > 0) {
        projectsByHub.set(h.name, hubProjects);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {type === 'portfolio' ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <FolderKanban className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="space-y-6 pr-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                {/* Project Managers Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-primary" />
                    Project Manager{categorizedUsers.projectManagers.length !== 1 ? 's' : ''}
                  </h3>
                  {categorizedUsers.projectManagers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categorizedUsers.projectManagers.map(pm => (
                        <div 
                          key={pm.user_id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{pm.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{pm.position}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Project Managers assigned</p>
                  )}
                </div>

                <Separator />

                {/* Hub Leads Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-orange-500" />
                    Hub Lead{categorizedUsers.hubLeads.length !== 1 ? 's' : ''}
                  </h3>
                  {categorizedUsers.hubLeads.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categorizedUsers.hubLeads.map(lead => (
                        <div 
                          key={lead.user_id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20"
                        >
                          <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{lead.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.position}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Hub Leads assigned</p>
                  )}
                </div>

                <Separator />

                {/* Project Engineers Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-blue-500" />
                    Project Engineer{categorizedUsers.projectEngineers.length !== 1 ? 's' : ''}
                  </h3>
                  {categorizedUsers.projectEngineers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categorizedUsers.projectEngineers.map(eng => (
                        <div 
                          key={eng.user_id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20"
                        >
                          <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{eng.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{eng.position}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Project Engineers assigned</p>
                  )}
                </div>

                <Separator />

                {/* Hubs & Projects Section */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4 text-green-500" />
                    {type === 'portfolio' ? 'Hubs & Projects' : 'Projects'}
                  </h3>
                  
                  {type === 'portfolio' && portfolio ? (
                    <div className="space-y-4">
                      {portfolio.hubs.map(h => {
                        const hubProjects = projects?.filter(p => p.hub_id === h.id) || [];
                        const hubMilestones = milestones?.filter(m => 
                          hubProjects.some(p => p.id === m.project_id)
                        ) || [];
                        
                        return (
                          <div key={h.id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{h.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {hubProjects.length} projects
                              </Badge>
                            </div>
                            
                            {hubProjects.length > 0 ? (
                              <div className="space-y-2 ml-6">
                                {hubProjects.map(project => {
                                  const projectMilestones = milestones?.filter(m => m.project_id === project.id) || [];
                                  return (
                                    <div key={project.id} className="p-2 bg-muted/50 rounded-md">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">
                                          {project.project_id_prefix}-{project.project_id_number}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          Active
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {project.project_title}
                                      </p>
                                      {projectMilestones.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {projectMilestones.slice(0, 3).map(ms => (
                                            <Badge 
                                              key={ms.id} 
                                              variant="outline"
                                              className={`text-xs ${getStatusColor(ms.status)}`}
                                            >
                                              <Calendar className="h-2.5 w-2.5 mr-1" />
                                              {ms.milestone_name}
                                            </Badge>
                                          ))}
                                          {projectMilestones.length > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                              +{projectMilestones.length - 3} more
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground ml-6">No projects</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Hub view - show projects directly
                    <div className="space-y-2">
                      {projects && projects.length > 0 ? (
                        projects.map(project => {
                          const projectMilestones = milestones?.filter(m => m.project_id === project.id) || [];
                          return (
                            <div key={project.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">
                                  {project.project_id_prefix}-{project.project_id_number}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {project.project_title}
                              </p>
                              {projectMilestones.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {projectMilestones.map(ms => (
                                    <Badge 
                                      key={ms.id} 
                                      variant="outline"
                                      className={`text-xs ${getStatusColor(ms.status)}`}
                                    >
                                      {getStatusIcon(ms.status)}
                                      <span className="ml-1">{ms.milestone_name}</span>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">No projects in this hub</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">
                      {categorizedUsers.projectManagers.length}
                    </p>
                    <p className="text-xs text-muted-foreground">PMs</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-500">
                      {categorizedUsers.hubLeads.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Hub Leads</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {categorizedUsers.projectEngineers.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Engineers</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-500">
                      {projects?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
