
import { useState } from 'react';
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

export const useProjectsData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const { addUsersFromProject } = useUsersContext();

  console.log('useProjectsData: Current projects state:', projects);

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
