import { useState, useEffect } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isFunctionalEmail?: boolean;
  personalEmail?: string;
  phone: string;
  company: string;
  role: string;
  discipline?: string;
  commission?: string;
  privileges: string[];
  status: 'active' | 'pending' | 'inactive';
  associatedProjects: string[];
  pendingActions: number;
  createdAt: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);

  // Load users from localStorage on mount
  useEffect(() => {
    const savedUsers = localStorage.getItem('p2a-users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      // Initialize with some sample data
      const sampleUsers: User[] = [
        {
          id: "1",
          firstName: "Ahmed",
          lastName: "Al-Rashid",
          email: "ahmed.rashid@bgc.iq",
          phone: "+964 770 123 4567",
          company: "BGC",
          role: "Plant Director",
          privileges: ["Edit or Create New Project", "Edit or Create New User"],
          status: "active",
          associatedProjects: ["Project Alpha", "Project Beta"],
          pendingActions: 2,
          createdAt: "2024-01-15T10:00:00Z"
        },
        {
          id: "2",
          firstName: "Sarah",
          lastName: "Mitchell",
          email: "sarah.mitchell@kent.com",
          phone: "+44 20 7946 0958",
          company: "Kent",
          role: "Technical Authority (TA2)",
          discipline: "Process",
          commission: "Project and Engineering",
          privileges: ["Edit PSSR Checklist item Default approvers and PSSR Approvers"],
          status: "active",
          associatedProjects: ["Project Alpha"],
          pendingActions: 0,
          createdAt: "2024-02-10T14:30:00Z"
        },
        {
          id: "3",
          firstName: "Omar",
          lastName: "Hassan",
          email: "omar.hassan@contractor.com",
          isFunctionalEmail: true,
          personalEmail: "omar.personal@gmail.com",
          phone: "+964 771 987 6543",
          company: "Others",
          role: "Commissioning Lead",
          privileges: ["Complete assigned tasks or delegate"],
          status: "pending",
          associatedProjects: [],
          pendingActions: 1,
          createdAt: "2024-03-05T09:15:00Z"
        }
      ];
      setUsers(sampleUsers);
      localStorage.setItem('p2a-users', JSON.stringify(sampleUsers));
    }
  }, []);

  // Save users to localStorage whenever users change
  useEffect(() => {
    localStorage.setItem('p2a-users', JSON.stringify(users));
  }, [users]);

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  const getUsersByProject = (projectName: string) => {
    return users.filter(user => user.associatedProjects.includes(projectName));
  };

  const getUsersByCompany = (company: string) => {
    return users.filter(user => user.company === company);
  };

  const getUsersByRole = (role: string) => {
    return users.filter(user => user.role === role);
  };

  const getPendingUsers = () => {
    return users.filter(user => user.status === 'pending');
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const pendingUsers = users.filter(user => user.status === 'pending').length;

  return {
    users,
    totalUsers,
    activeUsers,
    pendingUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByProject,
    getUsersByCompany,
    getUsersByRole,
    getPendingUsers,
  };
};