
import { useState } from 'react';
import { useProjectsData } from './useProjectsData';

export const useProjectCreation = () => {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { handleNewProjectAdded } = useProjectsData();

  const openCreateProject = () => {
    console.log('Opening create project modal');
    setShowCreateProject(true);
  };

  const closeCreateProject = () => {
    setShowCreateProject(false);
  };

  const handleCreateProjectSubmit = (projectData: any) => {
    console.log('Creating new project:', projectData);
    const newProject = handleNewProjectAdded(projectData);
    setShowCreateProject(false);
    return newProject;
  };

  return {
    showCreateProject,
    openCreateProject,
    closeCreateProject,
    handleCreateProjectSubmit
  };
};
