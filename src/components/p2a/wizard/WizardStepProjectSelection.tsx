import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { Loader2, FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WizardStepProjectSelectionProps {
  projectId: string;
  onProjectChange: (projectId: string) => void;
}

export const WizardStepProjectSelection: React.FC<WizardStepProjectSelectionProps> = ({
  projectId,
  onProjectChange,
}) => {
  const { projects, isLoading } = useProjects();
  const selectedProject = projects?.find(p => p.id === projectId);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Select a Project</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Choose the project that will be handed over from Project team to Asset Operations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Project *</Label>
        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Choose a project for handover..." />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading projects...</span>
              </div>
            ) : projects?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No projects available
              </div>
            ) : (
              projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {project.project_id_prefix}-{project.project_id_number}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span>{project.project_title}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Project Details */}
      {selectedProject && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Project ID</span>
                <span className="font-medium">{selectedProject.project_id_prefix}-{selectedProject.project_id_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Title</span>
                <span className="font-medium">{selectedProject.project_title}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
