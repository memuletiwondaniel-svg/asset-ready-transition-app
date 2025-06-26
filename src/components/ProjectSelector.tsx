
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Plus } from 'lucide-react';
import AddNewProjectWidget from './AddNewProjectWidget';

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  hubLead: any;
  others: any[];
}

interface ProjectSelectorProps {
  projectId: string;
  projectName: string;
  projects: Project[];
  projectSearchOpen: boolean;
  onProjectSearchOpenChange: (open: boolean) => void;
  onProjectSelect: (value: string) => void;
  onProjectNameChange: (name: string) => void;
  onNewProjectCreate?: (project: Project) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projectId,
  projectName,
  projects,
  projectSearchOpen,
  onProjectSearchOpenChange,
  onProjectSelect,
  onProjectNameChange,
  onNewProjectCreate
}) => {
  const [showAddProjectWidget, setShowAddProjectWidget] = useState(false);

  const handleProjectSelect = (value: string) => {
    if (value === 'add-new') {
      setShowAddProjectWidget(true);
      onProjectSearchOpenChange(false);
    } else {
      onProjectSelect(value);
    }
  };

  const handleNewProjectSubmit = (projectData: any) => {
    console.log('New project created:', projectData);
    
    // Create new project object
    const newProject: Project = {
      id: projectData.projectId,
      name: projectData.projectTitle,
      plant: projectData.plant,
      subdivision: projectData.csLocation,
      scope: projectData.projectScope,
      hubLead: {
        ...projectData.projectHubLead,
        role: 'Project Hub Lead'
      },
      others: [
        ...(projectData.commissioningLead?.name ? [{
          ...projectData.commissioningLead,
          role: 'Commissioning Lead'
        }] : []),
        ...(projectData.constructionLead?.name ? [{
          ...projectData.constructionLead,
          role: 'Construction Lead'
        }] : []),
        ...projectData.additionalPersons
      ]
    };

    // Add to projects list and select it
    onNewProjectCreate?.(newProject);
    setShowAddProjectWidget(false);
  };

  const formatProjectId = (id: string) => {
    return `DP ${id}`;
  };

  return (
    <>
      <div className="space-y-3">
        <Label htmlFor="projectId" className="text-sm font-semibold text-gray-700">Project ID</Label>
        <Popover open={projectSearchOpen} onOpenChange={onProjectSearchOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projectSearchOpen}
              className="h-12 w-full justify-between border-2 border-gray-200 focus:border-blue-500 transition-colors"
            >
              {projectId ? formatProjectId(projectId) : "Search projects..."}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search projects..." className="h-9" />
              <CommandList>
                <CommandEmpty>
                  <div className="p-6 text-center">
                    <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      No projects found matching your search.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => handleProjectSelect('add-new')}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Project
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.id} ${project.name}`}
                      onSelect={() => handleProjectSelect(project.id)}
                      className="py-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{formatProjectId(project.id)}</span>
                        <span className="text-gray-600">- {project.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="add-new-project"
                    onSelect={() => handleProjectSelect('add-new')}
                    className="py-3 border-t border-gray-200 bg-blue-50"
                  >
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <Plus className="h-4 w-4" />
                      Add New Project
                    </div>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Add New Project Widget */}
      <AddNewProjectWidget
        open={showAddProjectWidget}
        onClose={() => setShowAddProjectWidget(false)}
        onSubmit={handleNewProjectSubmit}
        editMode={false}
      />
    </>
  );
};

export default ProjectSelector;
