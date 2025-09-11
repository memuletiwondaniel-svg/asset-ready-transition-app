import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  X,
  Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definitions matching the database schema exactly
interface DatabaseUser {
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: 'BGC' | 'KENT' | null;
  employee_id: string | null;
  job_title: string | null;
  department: string | null;
  phone_number: string | null;
  account_status: string | null;
  status: 'active' | 'inactive' | 'pending_approval' | 'suspended' | null;
  last_login_at: string | null;
  created_at: string;
  sso_enabled: boolean | null;
  two_factor_enabled: boolean | null;
  avatar_url: string | null;
  role: string;
  roles: string[];
  projects: string[];
  manager_name: string | null;
  pending_actions: number;
  login_attempts: number | null;
  locked_until: string | null;
  password_change_required: boolean | null;
  last_activity: string | null;
  ta2_discipline: string | null;
  ta2_commission: string | null;
  functional_email_address: string | null;
  personal_email: string | null;
  functional_email: boolean | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  country_code: string | null;
  position: string | null;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata: any;
}

interface EnhancedUserDetailsModalProps {
  user: DatabaseUser;
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  
  // Form state matching database fields exactly
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    functional_email_address: '',
    phone_number: '',
    primary_phone: '',
    secondary_phone: '',
    country_code: '',
    job_title: '',
    department: '',
    role: '',
    company: 'BGC' as 'BGC' | 'KENT' | null,
    status: 'active' as 'active' | 'inactive' | 'pending_approval' | 'suspended',
    account_status: '',
    sso_enabled: false,
    two_factor_enabled: false,
    password_change_required: false,
    functional_email: false,
    ta2_discipline: '',
    ta2_commission: ''
  });

  const [systemRole, setSystemRole] = useState('user');

  const systemRoles = [
    { value: "user", label: "User" },
    { value: "admin", label: "Administrator" },
    { value: "manager", label: "Manager" },
    { value: "engineer", label: "Engineer" },
    { value: "safety_officer", label: "Safety Officer" },
    { value: "technical_authority", label: "Technical Authority" },
  ];

  const companies = [
    { value: "BGC", label: "Basrah Gas Company (BGC)", logo: "/lovable-uploads/f5935f89-1889-4585-8c5c-60362063dcf7.png" },
    { value: "KENT", label: "Kent Engineering", logo: "/lovable-uploads/08d85d46-7571-49db-977b-a806bd1c91e5.png" }
  ];

  const statusOptions = [
    { value: "active", label: "Active", color: "text-green-600" },
    { value: "inactive", label: "Inactive", color: "text-gray-600" },
    { value: "pending_approval", label: "Pending Approval", color: "text-yellow-600" },
    { value: "suspended", label: "Suspended", color: "text-red-600" }
  ];

  const ta2Disciplines = [
    { value: "Process", label: "Process" },
    { value: "Technical Safety", label: "Technical Safety" },
    { value: "Mechanical", label: "Mechanical" },
    { value: "Electrical", label: "Electrical" },
    { value: "Instrumentation", label: "Instrumentation" }
  ];

  const ta2Commissions = [
    { value: "Project and Engineering", label: "Project and Engineering" },
    { value: "Operations", label: "Operations" },
    { value: "Maintenance", label: "Maintenance" }
  ];

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        functional_email_address: user.functional_email_address || '',
        phone_number: user.phone_number || '',
        primary_phone: user.primary_phone || '',
        secondary_phone: user.secondary_phone || '',
        country_code: user.country_code || '+964',
        job_title: user.job_title || '',
        department: user.department || '',
        role: user.role || '',
        company: user.company || 'BGC',
        status: user.status || 'active',
        account_status: user.account_status || 'active',
        sso_enabled: user.sso_enabled || false,
        two_factor_enabled: user.two_factor_enabled || false,
        password_change_required: user.password_change_required || false,
        functional_email: user.functional_email || false,
        ta2_discipline: user.ta2_discipline || '',
        ta2_commission: user.ta2_commission || ''
      });
      
      setSystemRole(user.roles?.[0] || 'user');
      
      fetchActivityLogs();
      fetchUserSessions();
    }
  }, [isOpen, user]);


  const fetchActivityLogs = async () => {
    if (!user?.user_id) return;
    
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
    if (!user?.user_id) return;
    
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
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      console.log('Saving user data:', formData);

      // Prepare update payload with proper field mapping
      const updatePayload = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        full_name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || null,
        email: formData.email,
        functional_email_address: formData.functional_email_address || null,
        phone_number: formData.phone_number || null,
        primary_phone: formData.primary_phone || null,
        secondary_phone: formData.secondary_phone || null,
        country_code: formData.country_code || null,
        job_title: formData.job_title || null,
        department: formData.department || null,
        role: formData.role,
        company: formData.company,
        status: formData.status,
        account_status: formData.account_status || 'active',
        sso_enabled: formData.sso_enabled,
        two_factor_enabled: formData.two_factor_enabled,
        password_change_required: formData.password_change_required,
        functional_email: formData.functional_email,
        ta2_discipline: formData.ta2_discipline || null,
        ta2_commission: formData.ta2_commission || null,
        updated_at: new Date().toISOString()
      };

      console.log('Update payload:', updatePayload);

      // Update the profile using service role via edge function for better RLS handling
      const { data: updateResponse, error: profileError } = await supabase.functions.invoke('update-user-profile', {
        body: {
          userId: user.user_id,
          profileData: updatePayload
        }
      });

      if (profileError) {
        console.error('Profile update error:', profileError);
        toast.error(`Failed to update user: ${profileError.message}`);
        return;
      }

      console.log('Profile update response:', updateResponse);

      // Update system role if it changed
      if (systemRole !== (user.roles?.[0] || 'user')) {
        console.log('Updating system role from', user.roles?.[0], 'to', systemRole);
        
        // Delete existing roles
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        if (deleteError) {
          console.error('Error deleting existing roles:', deleteError);
        }

        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.user_id,
            role: systemRole as any,
            granted_by: user.user_id
          });

        if (roleError) {
          console.error('Error updating system role:', roleError);
          toast.error(`Failed to update system role: ${roleError.message}`);
          return;
        }
      }

      toast.success('User updated successfully');
      setEditMode(false);
      onUserUpdated(); // Refresh the parent list
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`An error occurred while updating user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.user_id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user_id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        toast.error('Failed to upload image');
        console.error('Upload error:', uploadError);
        return;
      }

      // Update user profile with new avatar URL via edge function
      const { data: avatarUpdateResp, error: avatarUpdateErr } = await supabase.functions.invoke('update-user-avatar', {
        body: { userId: user.user_id, avatarPath: fileName }
      });

      if (avatarUpdateErr) {
        toast.error('Failed to update profile');
        console.error('Update error:', avatarUpdateErr);
        return;
      }

      console.log('Avatar update response:', avatarUpdateResp);
      toast.success('Profile picture updated successfully');
      
      // Force refresh the user data in the parent component
      onUserUpdated();
    } catch (error) {
      toast.error('An error occurred while uploading');
      console.error('Avatar upload error:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'text-gray-600';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-border">
                  {user.avatar_url && (
                    <AvatarImage 
                      src={`https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${user.avatar_url}`} 
                      alt={user.full_name || 'User'} 
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold">
                    {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                {editMode && (
                  <div className="absolute -bottom-1 -right-1">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 shadow-sm">
                        <Camera className="h-3 w-3" />
                      </div>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.full_name || 'Unknown User'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="outline" className={getStatusColor(user.status || 'inactive')}>
                  {user.status || 'inactive'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!editMode ? (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Select
                    value={formData.company || ''}
                    onValueChange={(value) => handleInputChange('company', value as 'BGC' | 'KENT')}
                    disabled={!editMode}
                  >
                    <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.value} value={company.value}>
                          <div className="flex items-center gap-2">
                            <img src={company.logo} alt={company.value} className="w-4 h-4" />
                            {company.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => handleInputChange('job_title', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    disabled={!editMode}
                    className={!editMode ? 'bg-muted' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="system_role">System Role</Label>
                  <Select
                    value={systemRole}
                    onValueChange={setSystemRole}
                    disabled={!editMode}
                  >
                    <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {systemRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* TA2 Fields - only show if relevant */}
                {formData.role?.toLowerCase().includes('technical authority') && (
                  <>
                    <div>
                      <Label htmlFor="ta2_discipline">TA2 Discipline</Label>
                      <Select
                        value={formData.ta2_discipline}
                        onValueChange={(value) => handleInputChange('ta2_discipline', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Select discipline" />
                        </SelectTrigger>
                        <SelectContent>
                          {ta2Disciplines.map((discipline) => (
                            <SelectItem key={discipline.value} value={discipline.value}>
                              {discipline.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ta2_commission">TA2 Commission</Label>
                      <Select
                        value={formData.ta2_commission}
                        onValueChange={(value) => handleInputChange('ta2_commission', value)}
                        disabled={!editMode}
                      >
                        <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Select commission" />
                        </SelectTrigger>
                        <SelectContent>
                          {ta2Commissions.map((commission) => (
                            <SelectItem key={commission.value} value={commission.value}>
                              {commission.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Contact Information Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!editMode}
                    className={!editMode ? 'bg-muted' : ''}
                  />
                </div>


                <div>
                  <Label htmlFor="functional_email_address">Functional Email</Label>
                  <Input
                    id="functional_email_address"
                    type="email"
                    value={formData.functional_email_address}
                    onChange={(e) => handleInputChange('functional_email_address', e.target.value)}
                    disabled={!editMode}
                    className={!editMode ? 'bg-muted' : ''}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country_code">Country Code</Label>
                    <Select
                      value={formData.country_code}
                      onValueChange={(value) => handleInputChange('country_code', value)}
                      disabled={!editMode}
                    >
                      <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+964">+964 (Iraq)</SelectItem>
                        <SelectItem value="+1">+1 (US/Canada)</SelectItem>
                        <SelectItem value="+44">+44 (UK)</SelectItem>
                        <SelectItem value="+31">+31 (Netherlands)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone_number">Primary Phone</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_phone">Alternative Phone 1</Label>
                    <Input
                      id="primary_phone"
                      value={formData.primary_phone}
                      onChange={(e) => handleInputChange('primary_phone', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_phone">Alternative Phone 2</Label>
                    <Input
                      id="secondary_phone"
                      value={formData.secondary_phone}
                      onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Account Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={!editMode}
                  >
                    <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className={status.color}>{status.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sso_enabled">SSO Enabled</Label>
                      <p className="text-sm text-muted-foreground">Enable single sign-on for this user</p>
                    </div>
                    <Switch
                      id="sso_enabled"
                      checked={formData.sso_enabled}
                      onCheckedChange={(checked) => handleInputChange('sso_enabled', checked)}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="two_factor_enabled">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for login</p>
                    </div>
                    <Switch
                      id="two_factor_enabled"
                      checked={formData.two_factor_enabled}
                      onCheckedChange={(checked) => handleInputChange('two_factor_enabled', checked)}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="password_change_required">Password Change Required</Label>
                      <p className="text-sm text-muted-foreground">Force password change on next login</p>
                    </div>
                    <Switch
                      id="password_change_required"
                      checked={formData.password_change_required}
                      onCheckedChange={(checked) => handleInputChange('password_change_required', checked)}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="functional_email">Has Functional Email</Label>
                      <p className="text-sm text-muted-foreground">User has a functional email setup</p>
                    </div>
                    <Switch
                      id="functional_email"
                      checked={formData.functional_email}
                      onCheckedChange={(checked) => handleInputChange('functional_email', checked)}
                      disabled={!editMode}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Last Login</Label>
                    <p className="text-muted-foreground">{formatDate(user.last_login_at)}</p>
                  </div>
                  <div>
                    <Label>Login Attempts</Label>
                    <p className="text-muted-foreground">{user.login_attempts || 0}</p>
                  </div>
                  <div>
                    <Label>Locked Until</Label>
                    <p className="text-muted-foreground">{formatDate(user.locked_until)}</p>
                  </div>
                  <div>
                    <Label>Last Activity</Label>
                    <p className="text-muted-foreground">{formatDate(user.last_activity)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Activity className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.activity_type}</p>
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No activity logs found</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {userSessions.length > 0 ? (
                  <div className="space-y-3">
                    {userSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Session {session.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            IP: {session.ip_address} • Last active: {formatDate(session.last_activity)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No active sessions</p>
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