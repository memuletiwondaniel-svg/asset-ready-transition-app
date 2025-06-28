
import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export const useUsersData = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@bgc.com',
      role: 'Project Manager',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      status: 'active',
      lastLogin: '2 hours ago'
    },
    {
      id: '2',
      name: 'Sarah Smith',
      email: 'sarah.smith@bgc.com',
      role: 'Commissioning Lead',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9c1e6b4?w=150&h=150&fit=crop&crop=face',
      status: 'active',
      lastLogin: '1 day ago'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@bgc.com',
      role: 'Construction Lead',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      status: 'inactive',
      lastLogin: '1 week ago'
    }
  ]);

  console.log('useUsersData: Current users state:', users);

  const addUsersFromProject = (projectData: any) => {
    console.log('useUsersData: Adding users from project:', projectData);
    
    const newUsers: User[] = [];
    
    // Add project hub lead
    if (projectData.projectHubLead?.name && projectData.projectHubLead?.email) {
      const existingUser = users.find(u => u.email === projectData.projectHubLead.email);
      if (!existingUser) {
        newUsers.push({
          id: `user_${Date.now()}_${Math.random()}`,
          name: projectData.projectHubLead.name,
          email: projectData.projectHubLead.email,
          role: 'Project Manager',
          avatar: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
          status: 'active',
          lastLogin: 'Recently added'
        });
      }
    }

    // Add commissioning lead
    if (projectData.commissioningLead?.name && projectData.commissioningLead?.email) {
      const existingUser = users.find(u => u.email === projectData.commissioningLead.email);
      if (!existingUser) {
        newUsers.push({
          id: `user_${Date.now()}_${Math.random()}`,
          name: projectData.commissioningLead.name,
          email: projectData.commissioningLead.email,
          role: 'Commissioning Lead',
          avatar: `https://images.unsplash.com/photo-1494790108755-2616b9c1e6b4?w=150&h=150&fit=crop&crop=face`,
          status: 'active',
          lastLogin: 'Recently added'
        });
      }
    }

    // Add construction lead
    if (projectData.constructionLead?.name && projectData.constructionLead?.email) {
      const existingUser = users.find(u => u.email === projectData.constructionLead.email);
      if (!existingUser) {
        newUsers.push({
          id: `user_${Date.now()}_${Math.random()}`,
          name: projectData.constructionLead.name,
          email: projectData.constructionLead.email,
          role: 'Construction Lead',
          avatar: `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`,
          status: 'active',
          lastLogin: 'Recently added'
        });
      }
    }

    // Add additional team members
    if (projectData.additionalPersons && Array.isArray(projectData.additionalPersons)) {
      projectData.additionalPersons.forEach((person: any) => {
        if (person.name && person.email) {
          const existingUser = users.find(u => u.email === person.email);
          if (!existingUser) {
            newUsers.push({
              id: `user_${Date.now()}_${Math.random()}`,
              name: person.name,
              email: person.email,
              role: person.role || 'Team Member',
              avatar: `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`,
              status: 'active',
              lastLogin: 'Recently added'
            });
          }
        }
      });
    }

    if (newUsers.length > 0) {
      console.log('useUsersData: Adding new users:', newUsers);
      setUsers(prev => {
        const updated = [...prev, ...newUsers];
        console.log('useUsersData: Updated users array:', updated);
        return updated;
      });
    }
  };

  const handleUserDelete = (userId: string) => {
    console.log('useUsersData: Deleting user:', userId);
    setUsers(prev => {
      const filtered = prev.filter(user => user.id !== userId);
      console.log('useUsersData: Users after deletion:', filtered);
      return filtered;
    });
  };

  const handleUserUpdate = (updatedUser: User) => {
    console.log('useUsersData: Updating user:', updatedUser);
    setUsers(prev => {
      const updated = prev.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      );
      console.log('useUsersData: Users after update:', updated);
      return updated;
    });
  };

  return {
    users,
    setUsers,
    addUsersFromProject,
    handleUserDelete,
    handleUserUpdate
  };
};
