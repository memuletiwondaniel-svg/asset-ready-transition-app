
import React, { createContext, useContext, ReactNode } from 'react';
import { useUsersData } from '@/hooks/useUsersData';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  projects?: string[]; // Array of project IDs the user is associated with
}

interface UsersContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addUsersFromProject: (projectData: any) => void;
  handleUserDelete: (userId: string) => void;
  handleUserUpdate: (updatedUser: User) => void;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const useUsersContext = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsersContext must be used within a UsersProvider');
  }
  return context;
};

interface UsersProviderProps {
  children: ReactNode;
}

export const UsersProvider: React.FC<UsersProviderProps> = ({ children }) => {
  const usersData = useUsersData();

  return (
    <UsersContext.Provider value={usersData}>
      {children}
    </UsersContext.Provider>
  );
};
