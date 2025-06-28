
import React, { createContext, useContext, ReactNode } from 'react';
import { useProjectsData } from '@/hooks/useProjectsData';

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

interface ProjectsContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  handleNewProjectAdded: (projectData: any) => Project;
  handleProjectDelete: (projectId: string) => void;
  handleProjectUpdate: (updatedProject: Project) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const useProjectsContext = () => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjectsContext must be used within a ProjectsProvider');
  }
  return context;
};

interface ProjectsProviderProps {
  children: ReactNode;
}

export const ProjectsProvider: React.FC<ProjectsProviderProps> = ({ children }) => {
  const projectsData = useProjectsData();

  return (
    <ProjectsContext.Provider value={projectsData}>
      {children}
    </ProjectsContext.Provider>
  );
};
