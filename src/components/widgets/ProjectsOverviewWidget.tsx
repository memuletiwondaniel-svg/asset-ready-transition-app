import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';

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
  
  // Get active projects (limit to 4 for the widget)
  const activeProjects = projects?.filter(p => p.is_active)?.slice(0, 4) || [];
  
  // Calculate stats
  const totalActive = activeProjects.length;
  const avgProgress = totalActive > 0 
    ? Math.round(activeProjects.reduce((acc, p) => acc + getProjectProgress(p), 0) / totalActive)
    : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'text-emerald-500';
    if (progress >= 50) return 'text-amber-500';
    return 'text-primary';
  };

  const getProgressBg = (progress: number) => {
    if (progress >= 75) return 'bg-emerald-500/20';
    if (progress >= 50) return 'bg-amber-500/20';
    return 'bg-primary/20';
  };

  if (isLoading) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
            Projects
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>{avgProgress}% avg</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-2 pb-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <div className="p-1 rounded-md bg-primary/10">
              <Clock className="w-3 h-3 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{totalActive}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <div className="p-1 rounded-md bg-emerald-500/10">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{avgProgress}%</p>
              <p className="text-[10px] text-muted-foreground">Progress</p>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-1.5">
          {activeProjects.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No active projects
            </div>
          ) : (
            activeProjects.map((project) => {
              const progress = getProjectProgress(project);
              return (
                <div
                  key={project.id}
                  className="group p-2.5 rounded-lg border border-border/40 bg-card/50 hover:bg-muted/30 hover:border-border/60 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {project.project_title || 'Untitled Project'}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {project.plant_name || 'No location'}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getProgressBg(progress)} ${getProgressColor(progress)}`}>
                      <span>{progress}%</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={progress} 
                      className="h-1 bg-muted/50"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* View All Link */}
        {totalActive > 0 && (
          <button className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1.5">
            View all projects →
          </button>
        )}
      </CardContent>
    </>
  );
};