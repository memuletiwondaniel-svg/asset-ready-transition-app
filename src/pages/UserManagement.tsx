import { useState } from "react";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  UserPlus, 
  Users, 
  ArrowUpDown, 
  Eye,
  Edit,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  Home,
  Layers,
  MapPin
} from "lucide-react";
import EnhancedCreateUserModal from "@/components/user-management/EnhancedCreateUserModal";
import UserDetailsModal from "@/components/user-management/UserDetailsModal";
import AuthenticatorApprovalModal from "@/components/user-management/AuthenticatorApprovalModal";
import ConfigurationManagement from "@/components/user-management/ConfigurationManagement";
import LocationManagement from "@/components/user-management/LocationManagement";
import { useUsers } from "@/hooks/useUsers";
import { useNavigate } from 'react-router-dom';

interface UserManagementProps {
  onBack: () => void;
}

const UserManagement = ({ onBack }: UserManagementProps) => {
  const { buildBreadcrumbsFromPath } = useBreadcrumb();
  const breadcrumbs = buildBreadcrumbsFromPath();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [userToApprove, setUserToApprove] = useState<any>(null);
  
  const { 
    users, 
    totalUsers, 
    activeUsers, 
    pendingUsers, 
    newUsers, 
    rejectedUsers,
    addUser, 
    updateUser 
  } = useUsers();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || filterRole === "all" || user.role === filterRole;
    const matchesCompany = !filterCompany || filterCompany === "all" || user.company === filterCompany;
    const matchesProject = !filterProject || filterProject === "all" || user.associatedProjects.includes(filterProject);
    
    return matchesSearch && matchesRole && matchesCompany && matchesProject;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortBy as keyof typeof a];
    let bValue = b[sortBy as keyof typeof b];
    
    if (sortBy === "name") {
      aValue = `${a.firstName} ${a.lastName}`;
      bValue = `${b.firstName} ${b.lastName}`;
    }
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleCreateUser = (userData: any) => {
    addUser(userData);
    setShowCreateUser(false);
  };

  const handleApproveUser = (userId: string, privileges: string[], userData: any) => {
    updateUser(userId, {
      ...userData,
      privileges,
      status: 'new',
    });
    setShowApprovalModal(false);
    setUserToApprove(null);
  };

  const handleRejectUser = (userId: string, reason: string) => {
    updateUser(userId, {
      status: 'rejected',
      rejectionReason: reason,
    });
    setShowApprovalModal(false);
    setUserToApprove(null);
  };

  const openApprovalModal = (user: any) => {
    setUserToApprove(user);
    setShowApprovalModal(true);
  };

  const roles = [
    "Project Manager",
    "Commissioning Lead", 
    "Construction Lead",
    "Technical Authority (TA2 - Project)",
    "Technical Authority (TA2 - Asset)",
    "Plant Director",
    "Deputy Plant Director",
    "Operations Coach",
    "Operation Readiness & Assurance Engineer",
    "Site Engineer",
    "Ops HSE Lead",
    "Project HSE Lead",
    "ER Lead",
    "P&M Director",
    "HSE Director",
    "P&E Director"
  ];

  const companies = ["Asset Owner", "Kent", "Others"];
  const projects = ["Project Alpha", "Project Beta", "Project Gamma"]; // Mock projects


  return (
    <div className="flex-1 overflow-auto">
        <AnimatedBackground>
          <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            {/* Breadcrumb Navigation with History */}
            <BreadcrumbNavigation 
              currentPageLabel="User Management"
              className="mb-4"
            />

            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                User Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage users and their access to the P2A application
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locations
              </TabsTrigger>
              <TabsTrigger value="configuration" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Approval</p>
                      <p className="text-2xl font-bold text-yellow-600">{pendingUsers}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold text-red-600">{rejectedUsers}</p>
                    </div>
                  </div>
                </Card>
              </div>

          {/* Add User Button */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter Users
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project} value={project}>{project}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setFilterRole("");
                  setFilterCompany("");
                  setFilterProject("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({sortedUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("company")}
                  >
                    <div className="flex items-center gap-1">
                      Company
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Pending Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow 
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{user.email}</p>
                        {user.isFunctionalEmail && user.personalEmail && (
                          <p className="text-xs text-gray-500">
                            Personal: {user.personalEmail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.company}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{user.role}</p>
                        {user.discipline && (
                          <p className="text-xs text-gray-500">
                            {user.discipline} - {user.commission}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.associatedProjects.slice(0, 2).map((project) => (
                          <Badge key={project} variant="secondary" className="text-xs">
                            {project}
                          </Badge>
                        ))}
                        {user.associatedProjects.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.associatedProjects.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.pendingActions > 0 ? "destructive" : "secondary"}
                      >
                        {user.pendingActions} pending
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === 'active' ? "default" : 
                                user.status === 'awaiting authentication' ? "secondary" : 
                                user.status === 'new' ? "default" : "destructive"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {user.status === 'awaiting authentication' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openApprovalModal(user);
                              }}
                              className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
            </TabsContent>

            <TabsContent value="locations">
              <LocationManagement />
            </TabsContent>

            <TabsContent value="configuration">
              <ConfigurationManagement />
            </TabsContent>
          </Tabs>
        </div>

      {/* Modals */}
      <EnhancedCreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreateUser={handleCreateUser}
        isAdminCreated={true}
      />

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onEdit={() => {
            // TODO: Open edit user modal
            console.log('Edit user:', selectedUser);
          }}
        />
      )}

      {userToApprove && (
        <AuthenticatorApprovalModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          user={userToApprove}
          onApprove={handleApproveUser}
          onReject={handleRejectUser}
        />
      )}
        </div>
      </AnimatedBackground>
    </div>
  );
};

export default UserManagement;