import React, { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, Building2, Layers } from 'lucide-react';
import { useProjects, Project } from '@/hooks/useProjects';

interface ProjectHierarchySelectorProps {
  projectId: string;
  onProjectChange: (projectId: string, project: Project | null) => void;
  selectedProject: Project | null;
}

const ProjectHierarchySelector: React.FC<ProjectHierarchySelectorProps> = ({
  projectId,
  onProjectChange,
  selectedProject,
}) => {
  const { projects, isLoading: projectsLoading } = useProjects();

  const handleProjectChange = (value: string) => {
    const project = projects?.find(p => p.id === value) || null;
    onProjectChange(value, project);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h3 className="text-base font-medium">Project Selection</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Select the project for this PSSR. The portfolio and hub will be automatically populated.
      </p>

      {/* Project Selection */}
      <div className="space-y-2">
        <Label htmlFor="project" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Project *
        </Label>
        <Select
          value={projectId}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Search or select a project"} />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {project.project_id_prefix}-{project.project_id_number}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                    {project.project_title}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Auto-populated Hierarchy Info */}
      {selectedProject && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="font-medium">Project Hierarchy</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Project ID:</span>
              <p className="font-medium">
                {selectedProject.project_id_prefix}-{selectedProject.project_id_number}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Project Title:</span>
              <p className="font-medium truncate" title={selectedProject.project_title}>
                {selectedProject.project_title}
              </p>
            </div>
            {selectedProject.hub_name && (
              <div>
                <span className="text-muted-foreground">Hub:</span>
                <p className="font-medium">{selectedProject.hub_name}</p>
              </div>
            )}
            {selectedProject.plant_name && (
              <div>
                <span className="text-muted-foreground">Plant:</span>
                <p className="font-medium">{selectedProject.plant_name}</p>
              </div>
            )}
            {selectedProject.station_name && (
              <div>
                <span className="text-muted-foreground">Station:</span>
                <p className="font-medium">{selectedProject.station_name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHierarchySelector;
