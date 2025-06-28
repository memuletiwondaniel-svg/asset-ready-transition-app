
import { useState, useEffect } from 'react';
import { useUsersContext } from '@/contexts/UsersContext';

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  milestone?: string;
  milestoneDate?: Date;
  scorecardProject?: string;
  hubLead: any;
  others: any[];
}

const PROJECTS_STORAGE_KEY = 'lovable_projects';

// Helper function to load projects from localStorage
const loadProjectsFromStorage = (): Project[] => {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert milestoneDate strings back to Date objects
      return parsed.map((project: any) => ({
        ...project,
        milestoneDate: project.milestoneDate ? new Date(project.milestoneDate) : undefined
      }));
    }
  } catch (error) {
    console.error('Error loading projects from localStorage:', error);
  }
  
  // Return sample project if nothing in storage
  return [
    {
      id: 'DP001',
      name: 'Sample Project 1',
      plant: 'Plant A',
      scope: 'Development',
      hubLead: { name: 'John Doe', email: 'john@example.com' },
      others: []
    }
  ];
};

// Helper function to save projects to localStorage
const saveProjectsToStorage = (projects: Project[]) => {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    console.log('Projects saved to localStorage:', projects.length);
  } catch (error) {
    console.error('Error saving projects to localStorage:', error);
  }
};

export const useProjectsData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const { addUsersFromProject } = useUsersContext();

  // Load projects from localStorage on component mount
  useEffect(() => {
    const loadedProjects = loadProjectsFromStorage();
    console.log('useProjectsData: Loading projects from storage:', loadedProjects);
    setProjects(loadedProjects);
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    if (projects.length > 0) {
      saveProjectsToStorage(projects);
    }
  }, [projects]);

  console.log('useProjectsData: Current projects state:', projects);
  console.log('useProjectsData: Projects count:', projects.length);

  const handleNewProjectAdded = (projectData: any) => {
    console.log('useProjectsData: Adding new project:', projectData);
    
    // Add users to the global users list
    addUsersFromProject(projectData);
    
    const newProject: Project = {
      id: projectData.projectId,
      name: projectData.projectTitle,
      plant: projectData.plant,
      subdivision: projectData.csLocation || undefined,
      scope: projectData.projectScope,
      milestone: projectData.projectMilestone,
      milestoneDate: projectData.milestoneDate,
      scorecardProject: projectData.scorecardProject,
      hubLead: {
        ...projectData.projectHubLead,
        role: 'Project Manager'
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
        ...(projectData.additionalPersons || []).map((person: any) => ({
          name: person.name,
          email: person.email,
          avatar: person.avatar || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
          status: person.status || 'green',
          role: person.role
        }))
      ]
    };

    console.log('useProjectsData: Created new project object:', newProject);

    setProjects(prev => {
      const updated = [...prev, newProject];
      console.log('useProjectsData: Updated projects array:', updated);
      console.log('useProjectsData: Total projects after addition:', updated.length);
      return updated;
    });
    
    return newProject;
  };

  const handleProjectDelete = (projectId: string) => {
    console.log('useProjectsData: Deleting project:', projectId);
    setProjects(prev => {
      const filtered = prev.filter(project => project.id !== projectId);
      console.log('useProjectsData: Projects after deletion:', filtered);
      return filtered;
    });
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    console.log('useProjectsData: Updating project:', updatedProject);
    setProjects(prev => {
      const updated = prev.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      );
      console.log('useProjectsData: Projects after update:', updated);
      return updated;
    });
  };

  return {
    projects,
    setProjects,
    handleNewProjectAdded,
    handleProjectDelete,
    handleProjectUpdate
  };
};
