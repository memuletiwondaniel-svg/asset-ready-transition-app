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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
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
  Users,
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
  Columns,
  Home,
  Layers,
  MapPin
} from 'lucide-react';
import { ThemeToggle } from '@/components/admin/ThemeToggle';
import LanguageSelector from '@/components/admin/LanguageSelector';
import UserProfileDropdown from '@/components/admin/UserProfileDropdown';
import OrshLogo from '@/components/ui/OrshLogo';
import AdminHeader from '@/components/admin/AdminHeader';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import EnhancedUserDetailsModal from './EnhancedUserDetailsModal';
import EnhancedCreateUserModal from './EnhancedCreateUserModal';
import { useLogActivity } from '@/hooks/useActivityLogs';
import ConfigurationManagement from './ConfigurationManagement';
import LocationManagement from './LocationManagement';


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
      className={`relative select-none group ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
    >
      <div className="flex items-center justify-between">
        <div 
          className={`flex items-center flex-1 ${column.sortable ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
          {column.sortable && (
            <div className="ml-1">
              {sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : sortDirection === 'desc' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4 opacity-0 group-hover:opacity-30" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center">
          <div 
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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

const EnhancedUserManagement: React.FC<EnhancedUserManagementProps> = ({ onBack, selectedLanguage = 'en', translations = {} }) => {
  const { user: currentUser } = useAuth();
  const { mutate: logActivity } = useLogActivity();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [activeMainTab, setActiveMainTab] = useState('users');

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
      
      // Clear all other column sorts and only set the current column
      return { [columnId]: newSort };
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
                  src={user.avatar_url.startsWith('http') 
                    ? `${user.avatar_url}?width=88&height=88&resize=cover` 
                    : `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${user.avatar_url}?width=88&height=88&resize=cover`}
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

  // Use refs to track modal state without causing re-renders
  const showCreateUserRef = React.useRef(showCreateUser);
  const selectedUserRef = React.useRef(selectedUser);
  const editingUserRef = React.useRef(editingUser);

  // Keep refs in sync
  React.useEffect(() => {
    showCreateUserRef.current = showCreateUser;
    selectedUserRef.current = selectedUser;
    editingUserRef.current = editingUser;
  }, [showCreateUser, selectedUser, editingUser]);

  useEffect(() => {
    fetchUsers(true);

    // Subscribe to profile changes for real-time updates
    const profileSubscription = supabase
      .channel('profile_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        (payload) => {
          console.log('Profile changed:', payload);
          // Skip refresh if any modal is open to prevent unmounting
          if (!showCreateUserRef.current && !selectedUserRef.current && !editingUserRef.current) {
            fetchUsers(false);
          }
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, statusFilter, companyFilter, roleFilter, columnSort]);

  const fetchUsers = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setInitialLoading(true);
      }
      const { data, error } = await supabase.rpc('get_enhanced_user_management_data');
      
      if (error) {
        toast.error('Failed to fetch users');
        console.error('Error fetching users:', error);
        return;
      }
      
      setUsers(data || []);
      
      // Update selectedUser and editingUser with fresh data if they exist
      if (selectedUser && data) {
        const updatedUser = data.find((u: User) => u.user_id === selectedUser.user_id);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
      
      if (editingUser && data) {
        const updatedUser = data.find((u: User) => u.user_id === editingUser.user_id);
        if (updatedUser) {
          setEditingUser(updatedUser);
        }
      }
    } catch (error) {
      toast.error('An error occurred while fetching users');
      console.error('Error:', error);
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      }
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
            aValue = a.position || a.role || '';
            bValue = b.position || b.role || '';
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
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">Active</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20">Awaiting Authentication</Badge>;
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
      // Use the secure delete function
      const { data, error } = await supabase
        .rpc('delete_user_account' as any, { target_user_id: userToDelete.user_id });

      if (error) {
        console.error('Error deleting user:', error);
        toast.error(`Failed to delete user: ${error.message}`);
        return;
      }

      // Check the response from the function
      const result = data as any as { success: boolean; error?: string };
      if (!result?.success) {
        toast.error(result?.error || 'Failed to delete user');
        return;
      }

      // Log activity
      logActivity({
        activityType: 'user_deleted',
        description: `Deleted user account for ${userToDelete.full_name || userToDelete.email}`,
        metadata: {
          user_id: userToDelete.user_id,
          user_email: userToDelete.email,
          user_name: userToDelete.full_name
        }
      });

      toast.success(`User ${userToDelete.full_name} deleted successfully`);
      fetchUsers(); // Refresh the list
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error('Failed to delete user');
      console.error('Error deleting user:', error);
    }
  };

  const companies = Array.from(new Set(users.map(user => user.company).filter(Boolean)));
  const roles = Array.from(new Set(users.map(user => user.role).filter(Boolean)));

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Background Layer */}
      <div className="absolute inset-0">
        <AnimatedBackground>
          <div />
        </AnimatedBackground>
      </div>
      
      {/* Content Layer - Fixed Header + Scrollable Content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <AdminHeader 
          icon={<Users className="w-6 h-6" />} 
          iconGradient="from-blue-500 to-blue-600"
          title="User Management" 
          description="Manage users, roles, and permissions across ORSH platform"
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: onBack },
            { label: 'Administration', path: '/admin-tools', onClick: onBack }
          ]}
        />

        {/* Main Tabs for Users and Configuration */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-xl mb-6">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="configuration" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Roles
                </TabsTrigger>
                <TabsTrigger value="locations" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Locations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4 mt-0">
            {/* Search and Filters Bar */}
            <Card className="border-border/40 shadow-sm animate-fade-in sticky top-0 z-20 bg-card/95 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  
                  {/* Filters Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-border/60 min-w-[120px]">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {(statusFilter !== 'all' || companyFilter !== 'all' || roleFilter !== 'all') && (
                          <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                            {[statusFilter !== 'all', companyFilter !== 'all', roleFilter !== 'all'].filter(Boolean).length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 bg-popover border shadow-lg z-50 p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">Filter Users</h4>
                          {(statusFilter !== 'all' || companyFilter !== 'all' || roleFilter !== 'all') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStatusFilter('all');
                                setCompanyFilter('all');
                                setRoleFilter('all');
                              }}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {/* Status Filter */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-full border-border/60 bg-background">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-[100]">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending_approval">Awaiting Authentication</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Company Filter */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Company</label>
                            <Select value={companyFilter} onValueChange={setCompanyFilter}>
                              <SelectTrigger className="w-full border-border/60 bg-background">
                                <SelectValue placeholder="Select company" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-[100]">
                                <SelectItem value="all">All Companies</SelectItem>
                                {companies.map(company => (
                                  <SelectItem key={company} value={company}>{company}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Role Filter */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Role</label>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                              <SelectTrigger className="w-full border-border/60 bg-background">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-[100]">
                                <SelectItem value="all">All Roles</SelectItem>
                                {roles.map(role => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Column Visibility */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-border/60">
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
                  
                  {/* Add User Button */}
                  <Button 
                    onClick={() => setShowCreateUser(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-border/40 shadow-sm animate-fade-in">
              <CardContent className="p-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-border/40">
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
                        {filteredUsers.map((user, index) => (
                          <TableRow 
                            key={user.user_id}
                            className="hover:bg-muted/50 transition-colors border-border/40 cursor-pointer"
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => setSelectedUser(user as any)}
                          >
                            {columns.filter(col => col.visible).map((column) => (
                              <TableCell 
                                key={column.id} 
                                style={{ width: column.width, minWidth: column.minWidth }}
                                onClick={(e) => {
                                  // Stop propagation for actions column to prevent row click
                                  if (column.id === 'actions') {
                                    e.stopPropagation();
                                  }
                                }}
                              >
                                {renderCellContent(column.id, user)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DndContext>
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="locations" className="mt-0">
                <LocationManagement />
              </TabsContent>


              <TabsContent value="configuration" className="mt-0">
                <ConfigurationManagement />
              </TabsContent>
            </Tabs>
          </div>
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
          onClose={() => {
            setEditingUser(null);
            setSelectedUser(null);
          }}
          onUserUpdated={fetchUsers}
          initialEditMode={true}
        />
      )}

      <EnhancedCreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreateUser={() => {
          fetchUsers();
          setShowCreateUser(false);
        }}
        isAdminCreated={true}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete User Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>
                  You are about to permanently delete the account for:
                </p>
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <p className="font-semibold text-foreground">{userToDelete?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{userToDelete?.email}</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warning: This action cannot be undone
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>User account will be permanently deleted</li>
                    <li>All associated data will be removed</li>
                    <li>User will lose access to all projects</li>
                    <li>Activity history will be preserved for audit</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Yes, Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};

export default EnhancedUserManagement;