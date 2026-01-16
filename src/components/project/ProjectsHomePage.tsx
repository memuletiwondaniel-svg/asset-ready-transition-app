import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/useProjects';
import { useLanguage } from '@/contexts/LanguageContext';

import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { format } from 'date-fns';
import { Users, Calendar, FileText } from 'lucide-react';

interface ProjectsHomePageProps {
  onBack?: () => void;
}

const ProjectsHomePage = ({ onBack }: ProjectsHomePageProps) => {
  const navigate = useNavigate();
  const { translations: t } = useLanguage();
  const { projects, isLoading } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter projects based on search query
  const filteredProjects = projects?.filter(project => 
    project.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${project.project_id_prefix}${project.project_id_number}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.plant_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const getProjectColor = (prefix: string, number: string) => {
    const hash = `${prefix}${number}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      { bg: 'from-blue-500 to-blue-600', text: 'text-white', border: 'border-blue-400' },
      { bg: 'from-emerald-500 to-emerald-600', text: 'text-white', border: 'border-emerald-400' },
      { bg: 'from-violet-500 to-violet-600', text: 'text-white', border: 'border-violet-400' },
      { bg: 'from-amber-500 to-amber-600', text: 'text-white', border: 'border-amber-400' },
      { bg: 'from-rose-500 to-rose-600', text: 'text-white', border: 'border-rose-400' },
      { bg: 'from-cyan-500 to-cyan-600', text: 'text-white', border: 'border-cyan-400' },
    ];
    return colors[hash % colors.length];
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  return (
    <main className="flex-1 p-6 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <BreadcrumbNavigation 
            currentPageLabel="Projects" 
            customBreadcrumbs={[
              { label: 'Home', path: '/', onClick: () => navigate('/') }
            ]}
          />

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Projects</h1>
              <p className="text-muted-foreground">Browse and access your assigned projects</p>
            </div>
          </div>

          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className={viewMode === 'grid' ? 'h-48 rounded-lg' : 'h-20 rounded-lg'} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredProjects.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery ? 'No projects found' : 'No projects available'}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchQuery 
                    ? 'Try adjusting your search query to find what you\'re looking for.'
                    : 'You don\'t have any projects assigned yet. Contact your administrator for access.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grid View */}
          {!isLoading && filteredProjects.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const projectColor = getProjectColor(project.project_id_prefix, project.project_id_number);
                const progress = calculateProgress(project.completed_milestone_count || 0, project.milestone_count || 0);
                
                return (
                  <Card 
                    key={project.id}
                    className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardContent className="p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Badge 
                            variant="outline" 
                            className={`bg-gradient-to-r ${projectColor.bg} ${projectColor.text} ${projectColor.border} text-xs font-semibold px-2 py-0.5 mb-2`}
                          >
                            {project.project_id_prefix}{project.project_id_number}
                          </Badge>
                          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {project.project_title}
                          </h3>
                        </div>
                      </div>

                      {/* Plant Info */}
                      <div className="p-2.5 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plant</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-foreground">
                            {project.plant_name || 'Not assigned'}
                          </span>
                          {project.station_name && (
                            <Badge variant="outline" className="text-xs bg-background/50">
                              {project.station_name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Team Info */}
                      {project.team_count && project.team_count > 0 && (
                        <div className="flex items-center gap-2 py-2 border-t border-border/30">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex items-center gap-1.5 flex-1">
                            {project.team_lead_name && (
                              <>
                                <Avatar className="h-5 w-5 border border-border/50">
                                  <AvatarImage src={project.team_lead_avatar} />
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {project.team_lead_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">
                                  {project.team_lead_name}
                                </span>
                              </>
                            )}
                            {project.team_count > 1 && (
                              <span className="text-xs text-muted-foreground">
                                +{project.team_count - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Progress */}
                      {project.milestone_count && project.milestone_count > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" indicatorClassName={progress === 100 ? "bg-emerald-500" : "bg-muted-foreground/50"} />
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-3">
                          {project.document_count !== undefined && project.document_count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{project.document_count}</span>
                            </div>
                          )}
                          {project.next_milestone_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(project.next_milestone_date), 'MMM d')}</span>
                            </div>
                          )}
                        </div>
                          <Badge 
                            variant={project.is_scorecard ? 'default' : 'secondary'} 
                            className={`text-[10px] ${project.is_scorecard ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                          >
                            {project.is_scorecard ? 'Scorecard' : 'Active'}
                          </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* List View */}
          {!isLoading && filteredProjects.length > 0 && viewMode === 'list' && (
            <div className="space-y-2">
              {filteredProjects.map((project) => {
                const projectColor = getProjectColor(project.project_id_prefix, project.project_id_number);
                const progress = calculateProgress(project.completed_milestone_count || 0, project.milestone_count || 0);
                
                return (
                  <Card 
                    key={project.id}
                    className="group cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Badge 
                        variant="outline" 
                        className={`bg-gradient-to-r ${projectColor.bg} ${projectColor.text} ${projectColor.border} text-xs font-semibold px-2 py-0.5 shrink-0`}
                      >
                        {project.project_id_prefix}{project.project_id_number}
                      </Badge>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {project.project_title}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {project.plant_name || 'No plant assigned'}
                          {project.station_name && ` • ${project.station_name}`}
                        </p>
                      </div>

                      <div className="hidden md:flex items-center gap-4 shrink-0">
                        {project.team_count && project.team_count > 0 && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{project.team_count}</span>
                          </div>
                        )}
                        
                        {project.milestone_count && project.milestone_count > 0 && (
                          <div className="w-24">
                            <Progress value={progress} className="h-1.5" indicatorClassName={progress === 100 ? "bg-emerald-500" : "bg-muted-foreground/50"} />
                          </div>
                        )}

                        <Badge 
                          variant={project.is_scorecard ? 'default' : 'secondary'} 
                          className={`text-xs ${project.is_scorecard ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                        >
                          {project.is_scorecard ? 'Scorecard' : 'Active'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
    </main>
  );
};

export default ProjectsHomePage;
