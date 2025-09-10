import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Mail,
  Phone,
  Building,
  User,
  Shield,
  Settings,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  company: string;
  employee_id: string;
  job_title: string;
  department: string;
  phone_number: string;
  account_status: string;
  status: string;
  last_login_at: string;
  created_at: string;
  sso_enabled: boolean;
  two_factor_enabled: boolean;
  roles: string[];
  projects: string[];
  manager_name: string;
  pending_actions: number;
  login_attempts: number;
  locked_until: string;
  password_change_required: boolean;
  last_activity: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata: any;
}

interface EnhancedUserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

const EnhancedUserDetailsModal: React.FC<EnhancedUserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated
}) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  
  const [editedUser, setEditedUser] = useState({
    full_name: user.full_name || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone_number: user.phone_number || '',
    job_title: user.job_title || '',
    department: user.department || '',
    company: (user.company as any) || 'BGC',
    status: (user.status as any) || 'active',
    sso_enabled: user.sso_enabled || false,
    two_factor_enabled: user.two_factor_enabled || false,
    password_change_required: user.password_change_required || false
  });

  useEffect(() => {
    if (isOpen) {
      fetchActivityLogs();
      fetchUserSessions();
    }
  }, [isOpen, user.user_id]);

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching activity logs:', error);
        return;
      }

      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        return;
      }

      setUserSessions(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedUser.full_name,
          first_name: editedUser.first_name,
          last_name: editedUser.last_name,
          email: editedUser.email,
          phone_number: editedUser.phone_number,
          job_title: editedUser.job_title,
          department: editedUser.department,
          company: editedUser.company,
          status: editedUser.status,
          sso_enabled: editedUser.sso_enabled,
          two_factor_enabled: editedUser.two_factor_enabled,
          password_change_required: editedUser.password_change_required
        })
        .eq('user_id', user.user_id);

      if (error) {
        toast.error('Failed to update user');
        console.error('Error updating user:', error);
        return;
      }

      toast.success('User updated successfully');
      setEditMode(false);
      onUserUpdated();
    } catch (error) {
      toast.error('An error occurred while updating user');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          login_attempts: 0,
          locked_until: null,
          account_status: 'active'
        })
        .eq('user_id', user.user_id);

      if (error) {
        toast.error('Failed to unlock user');
        return;
      }

      toast.success('User unlocked successfully');
      onUserUpdated();
    } catch (error) {
      toast.error('An error occurred while unlocking user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('initiate_password_reset', {
        user_email: user.email
      });

      if (error) {
        toast.error('Failed to initiate password reset');
        return;
      }

      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('An error occurred while resetting password');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'pending_approval': return 'text-yellow-600';
      case 'suspended': return 'text-red-600';
      case 'inactive': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.full_name || 'Unknown User'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!editMode ? (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={editedUser.first_name}
                      onChange={(e) => setEditedUser({ ...editedUser, first_name: e.target.value })}
                      disabled={!editMode}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={editedUser.last_name}
                      onChange={(e) => setEditedUser({ ...editedUser, last_name: e.target.value })}
                      disabled={!editMode}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={editedUser.phone_number}
                    onChange={(e) => setEditedUser({ ...editedUser, phone_number: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Work Information */}
            <Card>
              <CardHeader>
                <CardTitle>Work Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={editedUser.company}
                    onValueChange={(value) => setEditedUser({ ...editedUser, company: value })}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BGC">
                        <div className="flex items-center gap-2">
                          <img src="/lovable-uploads/5d0026a9-ed76-4745-9f0f-6a8a5e37993c.png" alt="BGC" className="w-4 h-4" />
                          Basrah Gas Company (BGC)
                        </div>
                      </SelectItem>
                      <SelectItem value="KENT">Kent Engineering</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={editedUser.job_title}
                    onChange={(e) => setEditedUser({ ...editedUser, job_title: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={editedUser.department}
                    onChange={(e) => setEditedUser({ ...editedUser, department: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                
                <div>
                  <Label>Employee ID</Label>
                  <Input value={user.employee_id || 'Not set'} disabled />
                </div>
              </CardContent>
            </Card>

            {/* Roles and Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Roles and Projects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Roles</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.roles?.map(role => (
                      <Badge key={role} variant="secondary">{role}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Projects</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.projects?.map(project => (
                      <Badge key={project} variant="outline">{project}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Manager</Label>
                  <Input value={user.manager_name || 'No manager assigned'} disabled />
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editedUser.status}
                    onValueChange={(value) => setEditedUser({ ...editedUser, status: value })}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>SSO Enabled</Label>
                  <Switch
                    checked={editedUser.sso_enabled}
                    onCheckedChange={(checked) => setEditedUser({ ...editedUser, sso_enabled: checked })}
                    disabled={!editMode}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Two-Factor Authentication</Label>
                  <Switch
                    checked={editedUser.two_factor_enabled}
                    onCheckedChange={(checked) => setEditedUser({ ...editedUser, two_factor_enabled: checked })}
                    disabled={!editMode}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Password Change Required</Label>
                  <Switch
                    checked={editedUser.password_change_required}
                    onCheckedChange={(checked) => setEditedUser({ ...editedUser, password_change_required: checked })}
                    disabled={!editMode}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Login Attempts</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.login_attempts > 3 ? "destructive" : "secondary"}>
                        {user.login_attempts} attempts
                      </Badge>
                      {user.login_attempts > 0 && (
                        <Button variant="outline" size="sm" onClick={handleUnlockUser} disabled={loading}>
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Account Lock Status</Label>
                    <div>
                      {user.locked_until ? (
                        <Badge variant="destructive">
                          Locked until {formatDate(user.locked_until)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not locked</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Password Management</Label>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleResetPassword} disabled={loading}>
                      Send Password Reset
                    </Button>
                  </div>
                  {user.password_change_required && (
                    <p className="text-sm text-orange-600">
                      User is required to change password on next login
                    </p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <Label>Account Creation</Label>
                  <p className="text-sm text-muted-foreground">
                    Created on {formatDate(user.created_at)}
                  </p>
                </div>
                
                <div>
                  <Label>Last Login</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(user.last_login_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {log.activity_type === 'login' && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {log.activity_type === 'failed_login' && <XCircle className="h-5 w-5 text-red-500" />}
                          {log.activity_type === 'password_reset_requested' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                          {log.activity_type === 'status_changed' && <Settings className="h-5 w-5 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(log.created_at)}
                          </p>
                          {log.metadata && (
                            <pre className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No activity logs found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {userSessions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>SSO Provider</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                Session {session.id.slice(0, 8)}...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created {formatDate(session.created_at)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {formatDate(session.last_activity)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {session.sso_provider ? (
                              <Badge variant="outline">{session.sso_provider}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Email/Password</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{session.ip_address}</code>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No active sessions found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedUserDetailsModal;