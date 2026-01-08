import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Building2, Layers, User } from 'lucide-react';
import { useProjects, Project } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { CreateProjectWizard } from '@/components/project/CreateProjectWizard';

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
  const queryClient = useQueryClient();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  // Convert projects to combobox options with a "Create New Project" option
  const projectOptions = [
    ...(projects?.map(p => ({
      value: p.id,
      label: `${p.project_id_prefix}-${p.project_id_number} - ${p.project_title}`
    })) || []),
    { value: '__create_new__', label: '+ Create New Project' }
  ];

  const handleProjectSelect = (value: string) => {
    if (value === '__create_new__') {
      setShowAddProjectModal(true);
      return;
    }
    const project = projects?.find(p => p.id === value) || null;
    onProjectChange(value, project);
  };

  const handleProjectModalClose = () => {
    setShowAddProjectModal(false);
    // Invalidate projects query to refetch and include any newly created project
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  return (
    <div className="space-y-5">
      {/* Project Selection */}
      <div className="space-y-2">
        <Label htmlFor="project" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Project *
        </Label>
        <EnhancedSearchableCombobox
          options={projectOptions}
          value={projectId}
          placeholder={projectsLoading ? "Loading projects..." : "Search or select a project..."}
          searchPlaceholder="Type to search by project ID or title..."
          onValueChange={handleProjectSelect}
          disabled={projectsLoading}
        />
      </div>

      {/* Enhanced Project Details Panel */}
      {selectedProject && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="font-medium">Project Details</span>
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
            {selectedProject.team_lead_name && (
              <div className="flex items-start gap-1">
                <span className="text-muted-foreground">Hub Lead:</span>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {selectedProject.team_lead_name}
                </p>
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

      {/* Add Project Wizard */}
      <CreateProjectWizard 
        open={showAddProjectModal} 
        onClose={handleProjectModalClose} 
      />
    </div>
  );
};

export default ProjectHierarchySelector;
