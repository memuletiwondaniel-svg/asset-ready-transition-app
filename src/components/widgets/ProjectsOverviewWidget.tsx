import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, TrendingUp, ArrowUpRight, Sparkles, Target, Zap } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getProjectColor } from '@/utils/projectColors';

interface ProjectsOverviewWidgetProps {
  settings?: Record<string, any>;
}

// Calculate progress from milestones
const getProjectProgress = (project: { milestone_count?: number; completed_milestone_count?: number }) => {
  if (!project.milestone_count || project.milestone_count === 0) return 0;
  return Math.round(((project.completed_milestone_count || 0) / project.milestone_count) * 100);
};

export const ProjectsOverviewWidget: React.FC<ProjectsOverviewWidgetProps> = ({ settings }) => {
  const { projects, isLoading } = useProjects();
  const navigate = useNavigate();
  
  // Get active projects (limit to 5 for the widget)
  const activeProjects = projects?.filter(p => p.is_active)?.slice(0, 5) || [];
  
  // Calculate stats
  const totalActive = projects?.filter(p => p.is_active)?.length || 0;
  const totalProjects = projects?.length || 0;
  const avgProgress = activeProjects.length > 0 
    ? Math.round(activeProjects.reduce((acc, p) => acc + getProjectProgress(p), 0) / activeProjects.length)
    : 0;

  const getProgressGradient = (progress: number) => {
    if (progress >= 75) return 'from-emerald-500 to-teal-400';
    if (progress >= 50) return 'from-amber-500 to-orange-400';
    if (progress >= 25) return 'from-blue-500 to-cyan-400';
    return 'from-primary to-accent';
  };

  if (isLoading) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            Projects
          </CardTitle>
          <button 
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group"
          >
            View all
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Hero Stats */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/10 p-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Projects</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {totalActive}
                </span>
                <span className="text-sm text-muted-foreground">/ {totalProjects}</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1 justify-end">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-emerald-500 font-medium">Avg Progress</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{avgProgress}%</div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-2">
          {activeProjects.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <Target className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No active projects</p>
            </div>
          ) : (
            activeProjects.map((project, index) => {
              const progress = getProjectProgress(project);
              const prefix = project.project_id_prefix || '';
              const number = project.project_id_number || '';
              const projectColor = getProjectColor(prefix, number);
              
              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group relative overflow-hidden rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                >
                  {/* Progress bar background */}
                  <div 
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressGradient(progress)} opacity-[0.08] transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                  
                  <div className="relative p-3 flex items-center gap-3">
                    {/* Rank indicator */}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    
                    {/* Project info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge 
                          variant="outline" 
                          className="text-[9px] font-semibold px-1.5 py-0 text-white border-0 leading-relaxed"
                          style={{ background: `linear-gradient(to right, ${projectColor.bgStart}, ${projectColor.bgEnd})` }}
                        >
                          {prefix}-{number}
                        </Badge>
                        {project.is_scorecard && (
                          <Zap className="w-3 h-3 text-amber-500" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {project.project_title || 'Untitled Project'}
                      </h4>
                    </div>
                    
                    {/* Progress indicator */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <div className={`text-sm font-bold bg-gradient-to-r ${getProgressGradient(progress)} bg-clip-text text-transparent`}>
                        {progress}%
                      </div>
                      <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(progress)} transition-all duration-500`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </>
  );
};
