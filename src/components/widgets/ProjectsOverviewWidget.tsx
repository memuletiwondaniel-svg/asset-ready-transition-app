import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProjectsOverviewWidgetProps {
  settings: Record<string, any>;
}

export const ProjectsOverviewWidget: React.FC<ProjectsOverviewWidgetProps> = ({ settings }) => {
  // Mock project data
  const projects = [
    {
      id: 1,
      name: 'Plant A Upgrade',
      progress: 75,
      status: 'On Track',
      statusColor: 'default' as const
    },
    {
      id: 2,
      name: 'Safety Systems Review',
      progress: 45,
      status: 'In Progress',
      statusColor: 'secondary' as const
    },
    {
      id: 3,
      name: 'Equipment Installation',
      progress: 90,
      status: 'Near Complete',
      statusColor: 'default' as const
    }
  ];

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Active Projects
        </CardTitle>
        <CardDescription className="text-xs">Project status and progress</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {projects.map((project, idx) => (
          <div
            key={project.id}
            className="p-4 rounded-lg border border-border/40 bg-gradient-to-br from-card/50 to-card/30 space-y-3"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm flex-1">{project.name}</h4>
              <Badge variant={project.statusColor} className="text-xs">
                {project.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </>
  );
};
