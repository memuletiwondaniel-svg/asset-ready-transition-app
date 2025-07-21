import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Building, 
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdate: (userId: string, updates: any) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    personalEmail: user?.personalEmail || '',
    phoneNumbers: user?.phoneNumbers || [{ countryCode: '+964', number: '' }],
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [recoveryData, setRecoveryData] = useState({
    email: user?.email || '',
    recoveryMethod: 'email',
  });

  const handleProfileUpdate = () => {
    if (!profileData.firstName || !profileData.lastName) {
      toast({
        title: "Missing Information",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    onUpdate(user.id, profileData);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been successfully updated.",
    });
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Simulate password change
    toast({
      title: "Password Changed",
      description: "Your password has been successfully updated.",
    });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleRecoveryRequest = () => {
    if (!recoveryData.email) {
      toast({
        title: "Email Required",
        description: "Please provide your email address for account recovery.",
        variant: "destructive",
      });
      return;
    }

    // Simulate recovery email
    toast({
      title: "Recovery Email Sent",
      description: "Please check your email for account recovery instructions.",
    });
  };

  const addPhoneNumber = () => {
    setProfileData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { countryCode: '+964', number: '' }]
    }));
  };

  const removePhoneNumber = (index: number) => {
    if (profileData.phoneNumbers.length > 1) {
      setProfileData(prev => ({
        ...prev,
        phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePhoneNumber = (index: number, field: 'countryCode' | 'number', value: string) => {
    setProfileData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) =>
        i === index ? { ...phone, [field]: value } : phone
      )
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile: {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Info
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </TabsTrigger>
            <TabsTrigger value="recovery" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Account Recovery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Work Email Address
                  </Label>
                  <Input
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    type="email"
                  />
                </div>

                {user.isFunctionalEmail && (
                  <div>
                    <Label>Personal Email Address</Label>
                    <Input
                      value={profileData.personalEmail}
                      onChange={(e) => setProfileData(prev => ({ ...prev, personalEmail: e.target.value }))}
                      type="email"
                      placeholder="personal@example.com"
                    />
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Phone className="h-4 w-4" />
                    Phone Numbers
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhoneNumber}
                      className="ml-auto"
                    >
                      Add Phone
                    </Button>
                  </Label>
                  <div className="space-y-2">
                    {profileData.phoneNumbers.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={phone.countryCode}
                          onChange={(e) => updatePhoneNumber(index, 'countryCode', e.target.value)}
                          className="w-24"
                          placeholder="+964"
                        />
                        <Input
                          value={phone.number}
                          onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                          placeholder="Phone number"
                          className="flex-1"
                        />
                        {profileData.phoneNumbers.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePhoneNumber(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="flex items-center gap-2 mb-2">
                    <Building className="h-4 w-4" />
                    Work Information (Read-only)
                  </Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Company:</span> {user.company}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> {user.role}
                    </div>
                    {user.discipline && (
                      <div>
                        <span className="font-medium">Discipline:</span> {user.discipline}
                      </div>
                    )}
                    {user.commission && (
                      <div>
                        <span className="font-medium">Commission:</span> {user.commission}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Contact your administrator to change work-related information.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleProfileUpdate}>
                Update Profile
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Password Requirements</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Include uppercase and lowercase letters</li>
                    <li>• Include at least one number</li>
                    <li>• Include at least one special character</li>
                  </ul>
                </div>

                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handlePasswordChange}>
                Change Password
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="recovery" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Recovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Account Recovery Information</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Use this feature if you're unable to access your account. A recovery email will be sent with instructions.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="recoveryEmail">Email Address for Recovery</Label>
                  <Input
                    id="recoveryEmail"
                    type="email"
                    value={recoveryData.email}
                    onChange={(e) => setRecoveryData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Recovery Process</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Click "Send Recovery Email" below</li>
                    <li>Check your email for recovery instructions</li>
                    <li>Follow the link in the email to reset your password</li>
                    <li>Create a new password following security guidelines</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleRecoveryRequest}>
                Send Recovery Email
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;