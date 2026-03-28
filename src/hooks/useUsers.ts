import { useState, useEffect } from "react";

interface PhoneNumber {
  countryCode: string;
  number: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isFunctionalEmail?: boolean;
  personalEmail?: string;
  phoneNumbers: PhoneNumber[];
  company: string;
  role: string;
  discipline?: string;
  commission?: string;
  privileges: string[];
  status: 'new' | 'awaiting authentication' | 'rejected' | 'active' | 'inactive';
  associatedProjects: string[];
  pendingActions: number;
  createdAt: string;
  authenticator?: string;
  rejectionReason?: string;
  createdBy?: 'admin' | 'self';
  temporaryPassword?: string;
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
          firstName: "User",
          lastName: "One",
          email: "user1@company.com",
          phoneNumbers: [{ countryCode: "+964", number: "770 123 4567" }],
          company: "Asset Owner",
          role: "Plant Director",
          privileges: ["Edit or Create New Project", "Edit, Create or Authenticate New User"],
          status: "active",
          associatedProjects: ["Project Alpha", "Project Beta"],
          pendingActions: 2,
          createdAt: "2024-01-15T10:00:00Z",
          createdBy: "admin"
        },
        {
          id: "2",
          firstName: "User",
          lastName: "Two",
          email: "user2@company.com",
          phoneNumbers: [{ countryCode: "+44", number: "20 7946 0958" }],
          company: "Kent",
          role: "Technical Authority (TA2)",
          discipline: "Process",
          commission: "Project and Engineering",
          privileges: ["Edit PSSR Checklist item Default approvers and PSSR Approvers"],
          status: "active",
          associatedProjects: ["Project Alpha"],
          pendingActions: 0,
          createdAt: "2024-02-10T14:30:00Z",
          createdBy: "admin"
        },
        {
          id: "3",
          firstName: "User",
          lastName: "Three",
          email: "user3@company.com",
          isFunctionalEmail: true,
          personalEmail: "user3.personal@gmail.com",
          phoneNumbers: [{ countryCode: "+964", number: "771 987 6543" }],
          company: "Others",
          role: "Commissioning Lead",
          privileges: ["Complete assigned tasks or delegate"],
          status: "awaiting authentication",
          associatedProjects: [],
          pendingActions: 1,
          createdAt: "2024-03-05T09:15:00Z",
          authenticator: "ORA Lead",
          createdBy: "self"
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
    return users.filter(user => user.status === 'awaiting authentication');
  };

  const getAwaitingAuthenticationUsers = () => {
    return users.filter(user => user.status === 'awaiting authentication');
  };

  const getRejectedUsers = () => {
    return users.filter(user => user.status === 'rejected');
  };

  const getNewUsers = () => {
    return users.filter(user => user.status === 'new');
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const pendingUsers = users.filter(user => user.status === 'awaiting authentication').length;
  const newUsers = users.filter(user => user.status === 'new').length;
  const rejectedUsers = users.filter(user => user.status === 'rejected').length;

  return {
    users,
    totalUsers,
    activeUsers,
    pendingUsers,
    newUsers,
    rejectedUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByProject,
    getUsersByCompany,
    getUsersByRole,
    getPendingUsers,
    getAwaitingAuthenticationUsers,
    getRejectedUsers,
    getNewUsers,
  };
};