import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  Shield, 
  Mail, 
  Phone, 
  Building, 
  User,
  Settings,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  GripVertical,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Columns
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import EnhancedUserDetailsModal from './EnhancedUserDetailsModal';
import CreateUserModal from './CreateUserModal'; // Uses edge function to create users

interface EnhancedUserManagementProps {
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}

interface User {
  user_id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  company: 'BGC' | 'KENT' | string;
  job_title: string;
  department: string;
  phone_number: string;
  account_status: string;
  status: string;
  last_login_at: string;
  created_at: string;
  sso_enabled: boolean;
  two_factor_enabled: boolean;
  avatar_url?: string;
  role?: string; // Make role optional for now
  roles: string[];
  projects: string[];
  manager_name: string;
  pending_actions: number;
  login_attempts: number;
  locked_until: string;
  password_change_required: boolean;
  last_activity: string;
  ta2_discipline?: string;
  ta2_commission?: string;
  functional_email_address?: string;
  personal_email?: string;
  functional_email?: boolean;
  primary_phone?: string;
  secondary_phone?: string;
  country_code?: string;
  position?: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  visible: boolean;
  sortable: boolean;
}

interface SortableTableHeaderProps {
  column: ColumnConfig;
  onResize: (id: string, width: number) => void;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (columnId: string) => void;
}

const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({ column, onResize, sortDirection, onSort }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: column.width,
    minWidth: column.minWidth,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = column.width;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(column.minWidth, startWidth + diff);
      onResize(column.id, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <TableHead 
      ref={setNodeRef} 
      style={style}
      className={`relative select-none ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          {column.label}
          {column.sortable && sortDirection && (
            <div className="ml-1">
              {sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center">
          <div 
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div
            className="cursor-col-resize w-1 h-4 bg-border hover:bg-primary transition-colors ml-1"
            onMouseDown={handleMouseDown}
          />
        </div>
      </div>
    </TableHead>
  );
};

const EnhancedUserManagement: React.FC<EnhancedUserManagementProps> = ({ onBack }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'role' | 'last_login' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'user', label: 'User', width: 250, minWidth: 200, visible: true, sortable: true },
    { id: 'company', label: 'Company', width: 200, minWidth: 150, visible: true, sortable: true },
    { id: 'role', label: 'Position', width: 180, minWidth: 120, visible: true, sortable: true },
    { id: 'systemRole', label: 'System Role', width: 150, minWidth: 120, visible: true, sortable: false },
    { id: 'status', label: 'Status', width: 140, minWidth: 100, visible: true, sortable: true },
    { id: 'actions', label: 'Actions', width: 100, minWidth: 80, visible: true, sortable: false }
  ]);
  const [columnSort, setColumnSort] = useState<{ [key: string]: 'asc' | 'desc' | null }>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleColumnResize = (id: string, width: number) => {
    setColumns(cols => cols.map(col => 
      col.id === id ? { ...col, width } : col
    ));
  };

  const handleColumnSort = (columnId: string) => {
    setColumnSort(prev => {
      const currentSort = prev[columnId];
      let newSort: 'asc' | 'desc' | null;
      
      if (currentSort === null || currentSort === undefined) {
        newSort = 'asc';
      } else if (currentSort === 'asc') {
        newSort = 'desc';
      } else {
        newSort = null;
      }
      
      return { ...prev, [columnId]: newSort };
    });
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(cols => cols.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const renderCellContent = (columnId: string, user: User) => {
    switch (columnId) {
      case 'user':
        return (
          <div className="flex items-center space-x-4">
            <Avatar className="h-11 w-11 ring-2 ring-border/10 shadow-sm hover:shadow-md transition-all duration-200 hover:ring-primary/20">
              {user.avatar_url ? (
                <AvatarImage 
                  src={`https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${user.avatar_url}`} 
                  alt={user.full_name || 'User'} 
                  className="object-cover"
                  onError={(e) => {
                    console.log('Avatar load error for user:', user.email, 'URL:', e.currentTarget.src);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold text-sm border border-border/20">
                {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.full_name || 'Unknown'}</div>
              <div className="text-sm text-muted-foreground flex items-center whitespace-nowrap overflow-hidden">
                <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {user.functional_email_address || user.email}
                </span>
              </div>
              {user.phone_number && (
                <div className="text-sm text-muted-foreground flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {user.phone_number}
                </div>
              )}
            </div>
          </div>
        );
      case 'company':
        return (
          <div className="space-y-1">
            <div className="flex items-center text-sm whitespace-nowrap">
              {user.company === 'BGC' ? (
                <>
                  <img src="/lovable-uploads/f5935f89-1889-4585-8c5c-60362063dcf7.png" alt="BGC Logo" className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Basrah Gas Company (BGC)</span>
                </>
              ) : user.company === 'KENT' ? (
                <>
                  <img src="/lovable-uploads/08d85d46-7571-49db-977b-a806bd1c91e5.png" alt="Kent Logo" className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">Kent Engineering</span>
                </>
              ) : (
                <>
                  <Building className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{user.company || 'No Company'}</span>
                </>
              )}
            </div>
            {user.job_title && (
              <div className="text-xs text-muted-foreground truncate">{user.job_title}</div>
            )}
          </div>
        );
      case 'role':
        return (
          <div className="space-y-1">
            {user.position ? (
              <div className="text-sm font-medium">
                {user.position}
              </div>
            ) : user.role && (
              <div className="text-sm font-medium">
                {user.role}
                {user.role === "Technical Authority (TA2)" && (user.ta2_discipline || user.ta2_commission) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {user.ta2_discipline && <span>{user.ta2_discipline}</span>}
                    {user.ta2_discipline && user.ta2_commission && <span> • </span>}
                    {user.ta2_commission && <span>{user.ta2_commission}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'systemRole':
        return (
          <div className="flex flex-wrap gap-1">
            {user.roles && user.roles.length > 0 && user.roles[0] !== null && (
              user.roles.slice(0, 1).map(role => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role}
                </Badge>
              ))
            )}
            {user.roles && user.roles.length > 1 && (
              <Badge variant="outline" className="text-xs">
                +{user.roles.length - 1}
              </Badge>
            )}
          </div>
        );
      case 'status':
        return (
          <div className="space-y-1">
            {getStatusBadge(user.status, user.account_status)}
            {user.sso_enabled && (
              <Badge variant="outline" className="text-xs">SSO</Badge>
            )}
            {user.two_factor_enabled && (
              <Badge variant="outline" className="text-xs">2FA</Badge>
            )}
            {user.password_change_required && (
              <Badge variant="destructive" className="text-xs">Password Reset Required</Badge>
            )}
          </div>
        );
      case 'lastActivity':
        return (
          <div className="text-sm">
            <div>{getLastActivityText(user.last_activity, user.last_login_at)}</div>
            {user.login_attempts > 0 && (
              <div className="text-xs text-red-600">
                {user.login_attempts} failed attempts
              </div>
            )}
          </div>
        );
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
              <DropdownMenuItem 
                onClick={() => setSelectedUser(user as any)}
                className="cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setEditingUser(user as any)}
                className="cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteUser(user)}
                className="cursor-pointer text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, statusFilter, companyFilter, roleFilter, columnSort]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_enhanced_user_management_data');
      
      if (error) {
        toast.error('Failed to fetch users');
        console.error('Error fetching users:', error);
        return;
      }
      
      setUsers(data || []);
    } catch (error) {
      toast.error('An error occurred while fetching users');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.functional_email_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.projects?.some(project => project.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesCompany && matchesRole;
    });

    // Apply column-based sorting
    const activeSort = Object.entries(columnSort).find(([_, direction]) => direction !== null);
    
    if (activeSort) {
      const [columnId, direction] = activeSort;
      
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (columnId) {
          case 'user':
            aValue = a.full_name || '';
            bValue = b.full_name || '';
            break;
          case 'company':
            aValue = a.company || '';
            bValue = b.company || '';
            break;
          case 'role':
            aValue = a.role || '';
            bValue = b.role || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          default:
            aValue = '';
            bValue = '';
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return 0;
      });
    }

    setFilteredUsers(filtered);
  };

  const getStatusBadge = (status: string, accountStatus: string) => {
    if (accountStatus === 'locked') {
      return <Badge variant="destructive">Locked</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary">Awaiting Authentication</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPendingActionsBadge = (count: number) => {
    if (count === 0) return null;
    
    return (
      <Badge variant={count > 5 ? "destructive" : "secondary"} className="ml-2">
        {count} pending
      </Badge>
    );
  };

  const getLastActivityText = (lastActivity: string, lastLogin: string) => {
    const activity = lastActivity || lastLogin;
    if (!activity) return 'Never';
    
    const date = new Date(activity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Note: This would typically require admin privileges and proper backend logic
      // For now, we'll show a toast that this action would be performed
      toast.success(`User ${userToDelete.full_name} would be deleted (admin action required)`);
      
      // In a real implementation, you would call:
      // await supabase.rpc('delete_user', { user_id: userToDelete.user_id });
      // fetchUsers(); // Refresh the list
      
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error('Failed to delete user');
      console.error('Error deleting user:', error);
    }
  };

  const companies = Array.from(new Set(users.map(user => user.company).filter(Boolean)));
  const roles = Array.from(new Set(users.map(user => user.role).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">
                Manage users, roles, and permissions across ORSH platform
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg z-50">
                <div className="p-2">
                  <div className="text-sm font-medium mb-2">Show/Hide Columns</div>
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={column.visible}
                        onChange={() => toggleColumnVisibility(column.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{column.label}</span>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={() => setShowCreateUser(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Awaiting Authentication</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.status === 'pending_approval').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending Actions</p>
                  <p className="text-2xl font-bold">
                    {users.reduce((sum, u) => sum + (u.pending_actions || 0), 0)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users, emails, or projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_approval">Awaiting Authentication</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableContext items={columns.filter(col => col.visible).map(col => col.id)} strategy={horizontalListSortingStrategy}>
                      {columns.filter(col => col.visible).map((column) => (
                        <SortableTableHeader
                          key={column.id}
                          column={column}
                          onResize={handleColumnResize}
                          sortDirection={columnSort[column.id] || null}
                          onSort={handleColumnSort}
                        />
                      ))}
                    </SortableContext>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    {columns.filter(col => col.visible).map((column) => (
                      <TableCell key={column.id} style={{ width: column.width, minWidth: column.minWidth }}>
                        {renderCellContent(column.id, user)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </DndContext>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {selectedUser && (
        <EnhancedUserDetailsModal
          user={selectedUser as any}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={fetchUsers}
        />
      )}

      {editingUser && (
        <EnhancedUserDetailsModal
          user={editingUser as any}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={fetchUsers}
          initialEditMode={true}
        />
      )}

      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onUserCreated={() => {
          fetchUsers();
          setShowCreateUser(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.full_name}</strong>? 
              This action cannot be undone and will permanently remove the user's account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EnhancedUserManagement;