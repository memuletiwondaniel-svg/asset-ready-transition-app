import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Bell, 
  Shield, 
  Settings,
  Eye,
  EyeOff,
  Save,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { toast } from 'sonner';

interface UserProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    company: '',
    backup_email: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    pssr_updates: true,
    system_alerts: true,
    delegation_alerts: true
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        toast.error('Failed to fetch profile');
        return;
      }

      setProfile(data);
      setProfileData({
        full_name: data.full_name || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        job_title: data.job_title || '',
        department: data.department || '',
        company: data.company || '',
        backup_email: data.backup_email || ''
      });

      const preferences = data.notification_preferences as any;
      setNotificationSettings(preferences || {
        email_notifications: true,
        pssr_updates: true,
        system_alerts: true,
        delegation_alerts: true
      });
    } catch (error) {
      toast.error('Error fetching profile');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      
      const updates = {
        ...profileData,
        full_name: `${profileData.first_name} ${profileData.last_name}`,
        notification_preferences: notificationSettings
      };

      const { error } = await updateProfile(updates);
      
      if (!error) {
        toast.success('Profile updated successfully');
        fetchUserProfile();
      }
    } catch (error) {
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Update password changed timestamp
      await supabase
        .from('profiles')
        .update({ 
          password_changed_at: new Date().toISOString(),
          password_change_required: false
        })
        .eq('user_id', user?.id);

      toast.success('Password updated successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setShowPasswordChange(false);
    } catch (error) {
      toast.error('Error updating password');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profileData.email) {
      toast.error('Email not found');
      return;
    }

    try {
      setLoading(true);
      const { error } = await resetPassword(profileData.email);
      
      if (!error) {
        toast.success('Password reset email sent to your email address');
      }
    } catch (error) {
      toast.error('Error sending password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: notificationSettings })
        .eq('user_id', user?.id);

      if (error) {
        toast.error('Failed to update notification settings');
        return;
      }

      toast.success('Notification settings updated');
    } catch (error) {
      toast.error('Error updating notifications');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {profileData.full_name ? profileData.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">Profile Settings</h2>
              <p className="text-sm text-muted-foreground">{profileData.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="backup_email">Backup Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="backup_email"
                      type="email"
                      value={profileData.backup_email}
                      onChange={(e) => setProfileData({ ...profileData, backup_email: e.target.value })}
                      className="pl-10"
                      placeholder="backup@email.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={profileData.job_title}
                    onChange={(e) => setProfileData({ ...profileData, job_title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={profileData.company}
                    onValueChange={(value) => setProfileData({ ...profileData, company: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BGC">Basrah Gas Company (BGC)</SelectItem>
                      <SelectItem value="KENT">Kent Engineering</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Password & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.password_change_required && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      Your password change is required. Please update your password.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password</Label>
                    <p className="text-sm text-muted-foreground">
                      Last changed: {profile?.password_changed_at ? 
                        new Date(profile.password_changed_at).toLocaleDateString() : 
                        'Never'
                      }
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                    <Button variant="outline" onClick={handlePasswordReset} disabled={loading}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </div>
                </div>

                {showPasswordChange && (
                  <Card className="p-4 border-2">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new_password">New Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="new_password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                            className="pl-10 pr-10"
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="confirm_password">Confirm New Password</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={passwordData.confirm_password}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                          placeholder="Confirm new password"
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button onClick={handlePasswordChange} disabled={loading}>
                          Update Password
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowPasswordChange(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <Separator />

                <div>
                  <Label>Two-Factor Authentication</Label>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                    <Switch 
                      checked={profile?.two_factor_enabled || false}
                      disabled 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact your administrator to enable 2FA
                  </p>
                </div>

                <div>
                  <Label>Single Sign-On (SSO)</Label>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      SSO authentication status
                    </p>
                    <Switch 
                      checked={profile?.sso_enabled || false}
                      disabled 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile?.sso_enabled ? 'SSO is enabled for your account' : 'SSO is not configured'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications for important updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_notifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>PSSR Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about PSSR status changes and approvals
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.pssr_updates}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, pssr_updates: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about system maintenance and updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.system_alerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, system_alerts: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Delegation Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when tasks are delegated to you
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.delegation_alerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, delegation_alerts: checked })
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleNotificationUpdate} disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileSettings;