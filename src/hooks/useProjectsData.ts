
import { useState } from 'react';

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

  const handleNewProjectAdded = (projectData: any) => {
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

    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const handleProjectDelete = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prev => prev.map(project => 
      project.id === updatedProject.id ? updatedProject : project
    ));
  };

  return {
    projects,
    setProjects,
    handleNewProjectAdded,
    handleProjectDelete,
    handleProjectUpdate
  };
};
