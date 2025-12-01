
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

  console.log('ProjectSelector - Projects count:', projects.length);
  console.log('ProjectSelector - Current projectId:', projectId);
  console.log('ProjectSelector - Search open:', projectSearchOpen);

  React.useEffect(() => {
    console.log('ProjectSelector mounted/updated with projects:', projects);
  }, [projects]);

  React.useEffect(() => {
    console.log('projectSearchOpen changed to:', projectSearchOpen);
  }, [projectSearchOpen]);

  const handleProjectSelect = (value: string) => {
    if (value === 'add-new') {
      setShowAddProjectWidget(true);
      onProjectSearchOpenChange(false);
    } else {
      const selectedProject = projects.find(p => p.id === value);
      if (selectedProject) {
        onProjectSelect(value);
        onProjectSearchOpenChange(false);
      }
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

  return (
    <>
      <div className="space-y-3">
        <Label htmlFor="projectId" className="text-sm font-semibold text-gray-700">Project ID</Label>
        <Popover open={projectSearchOpen} onOpenChange={onProjectSearchOpenChange} modal={false}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projectSearchOpen}
              className="h-12 w-full justify-between border-2 border-gray-200 focus:border-blue-500 transition-colors bg-white hover:bg-gray-50"
              type="button"
              onClick={(e) => {
                console.log('Button clicked! Current state:', projectSearchOpen);
                e.preventDefault();
                e.stopPropagation();
                onProjectSearchOpenChange(!projectSearchOpen);
              }}
            >
              <span className="text-left flex-1">{projectId || "Search projects..."}</span>
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[500px] p-0 bg-white border-2 shadow-xl z-[300]" 
            align="start" 
            side="bottom"
            sideOffset={8}
            avoidCollisions={true}
            collisionPadding={20}
            onOpenAutoFocus={(e) => {
              console.log('Popover opened and focused');
              e.preventDefault();
            }}
          >
            <Command className="bg-white">
              <CommandInput 
                placeholder="Type to search projects by ID or name..." 
                className="h-12 border-b-2 border-gray-100 bg-white" 
              />
              <CommandList className="max-h-[400px] bg-white overflow-y-auto">
                <CommandEmpty>
                  <div className="p-6 text-center bg-white">
                    <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-fit">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {projects.length === 0 
                        ? "No projects available yet. Create your first project!"
                        : "No projects found matching your search."
                      }
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => handleProjectSelect('add-new')}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      type="button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Project
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup className="bg-white">
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.id} ${project.name} ${project.plant}`}
                      onSelect={() => handleProjectSelect(project.id)}
                      className="py-3 px-4 cursor-pointer hover:bg-blue-50 transition-colors bg-white"
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span className="font-semibold text-gray-900">{project.id}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-700 flex-1">{project.name}</span>
                        </div>
                        <div className="ml-4 text-xs text-gray-500">
                          Plant: {project.plant}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  {projects.length > 0 && (
                    <CommandItem
                      value="add-new-project create new"
                      onSelect={() => handleProjectSelect('add-new')}
                      className="py-3 px-4 border-t-2 border-gray-200 bg-blue-50 hover:bg-blue-100 cursor-pointer sticky bottom-0"
                    >
                      <div className="flex items-center gap-2 text-blue-600 font-medium w-full">
                        <Plus className="h-4 w-4" />
                        Add New Project
                      </div>
                    </CommandItem>
                  )}
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
