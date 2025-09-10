import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Save,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserAuthenticationPageProps {
  token: string;
  onComplete: () => void;
}

interface UserData {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  personal_email?: string;
  functional_email: boolean;
  phone_number: string;
  company: string;
  job_title: string;
  ta2_discipline?: string;
  ta2_commission?: string;
  rejection_reason?: string;
  status: string;
}

const UserAuthenticationPage: React.FC<UserAuthenticationPageProps> = ({ token, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editedUser, setEditedUser] = useState<UserData | null>(null);
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const privilegeOptions = [
    { value: 'view_only', label: 'View Only', description: 'Can view data but cannot make changes' },
    { value: 'complete_delegate_tasks', label: 'Complete assigned tasks or delegate tasks', description: 'Can complete assigned tasks and delegate them to others' },
    { value: 'edit_pssr_checklist_approvers', label: 'Edit PSSR Checklist item Default approvers and PSSR Approvers', description: 'Can modify PSSR checklist approvers and default settings' },
    { value: 'manage_users', label: 'Edit, Create or Authenticate New User', description: 'Full user management capabilities' },
    { value: 'manage_projects', label: 'Edit or Create New Project', description: 'Can create and modify project information' },
    { value: 'manage_pssr_master_checklist', label: 'Edit or Create New PSSR Master Checklist', description: 'Can manage master PSSR checklists' },
    { value: 'manage_operation_readiness_plan', label: 'Create or Approve Operation Readiness Plan', description: 'Can create and approve operational readiness plans' },
    { value: 'manage_training_plan', label: 'Create or Approve Training Plan', description: 'Can create and approve training plans' },
    { value: 'manage_pac', label: 'Create or Approve PAC or PAC line Item', description: 'Can manage Project Acceptance Certificates' },
    { value: 'manage_fac', label: 'Create or Approve FAC or FAC line Item', description: 'Can manage Facility Acceptance Certificates' }
  ];

  const companies = [
    { value: 'BGC', label: 'Basrah Gas Company (BGC)', logo: '/lovable-uploads/5d0026a9-ed76-4745-9f0f-6a8a5e37993c.png' },
    { value: 'KENT', label: 'Kent Engineering' },
    { value: 'OTHER', label: 'Others' }
  ];

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('validate-auth-token', {
        body: { token: token }
      });

      if (error) throw error;

      if (!data || !data.is_valid) {
        toast.error('Invalid or expired authentication token');
        return;
      }

      const tokenInfo = data;
      setTokenData(tokenInfo);
      setUserData(tokenInfo.user_data);
      setEditedUser({ ...tokenInfo.user_data });
      
      // Set default privilege for new users
      setSelectedPrivileges(['view_only']);
      
    } catch (error: any) {
      toast.error('Error validating token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivilegeChange = (privilege: string, checked: boolean) => {
    setSelectedPrivileges(prev => {
      if (checked) {
        return [...prev, privilege];
      } else {
        return prev.filter(p => p !== privilege);
      }
    });
  };

  const handleApprove = async () => {
    if (selectedPrivileges.length === 0) {
      toast.error('Please select at least one privilege for the user');
      return;
    }

    try {
      setSubmitting(true);

      // Generate temporary password
      const tempPassword = generateTempPassword();
      
      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: editedUser!.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: editedUser!.full_name,
          first_name: editedUser!.first_name,
          last_name: editedUser!.last_name
        }
      });

      if (authError) throw authError;

      // Update profile with approved status and real user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_id: authUser.user.id,
          first_name: editedUser!.first_name,
          last_name: editedUser!.last_name,
          full_name: editedUser!.full_name,
          email: editedUser!.email,
          phone_number: editedUser!.phone_number,
          company: editedUser!.company as any,
          job_title: editedUser!.job_title,
          status: 'active' as any,
          account_status: 'active',
          password_change_required: true,
          temporary_password: tempPassword
        })
        .eq('user_id', tokenData.user_request_id);

      if (updateError) throw updateError;

      // Assign privileges using direct function call instead of table insert
      const privilegePromises = selectedPrivileges.map(privilege => 
        supabase.functions.invoke('assign-user-privilege', {
          body: {
            userId: authUser.user.id,
            privilege: privilege,
            grantedBy: tokenData.authenticator_id
          }
        })
      );

      await Promise.all(privilegePromises);

      // Assign default user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: 'user',
          granted_by: tokenData.authenticator_id
        });

      if (roleError) console.error('Role assignment error:', roleError);

      // Mark token as used
      await supabase.functions.invoke('use-auth-token', {
        body: { token: token }
      });

      // Send welcome email
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          userEmail: editedUser!.email,
          userName: editedUser!.full_name,
          temporaryPassword: tempPassword,
          loginUrl: window.location.origin
        }
      });

      setShowApprovalDialog(true);
      
    } catch (error: any) {
      toast.error('Error approving user: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);

      // Update user status to rejected
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString()
        })
        .eq('user_id', tokenData.user_request_id);

      if (updateError) throw updateError;

      // Mark token as used
      await supabase.functions.invoke('use-auth-token', {
        body: { token: token }
      });

      // Send rejection email
      await supabase.functions.invoke('send-rejection-email', {
        body: {
          userEmail: userData!.email,
          userName: userData!.full_name,
          rejectionReason: rejectionReason
        }
      });

      setShowRejectionDialog(false);
      toast.success('User request has been rejected and user has been notified');
      onComplete();
      
    } catch (error: any) {
      toast.error('Error rejecting user: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const generateTempPassword = (): string => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Validating authentication token...</p>
        </div>
      </div>
    );
  }

  if (!tokenData || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Token</h2>
              <p className="text-muted-foreground">
                The authentication token is invalid or has expired.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="h-6 w-6 mr-2" />
              User Authentication Request
            </CardTitle>
            <p className="text-muted-foreground">
              Review and authenticate the new user request below. You can edit user details and assign privileges.
            </p>
          </CardHeader>
        </Card>

        {/* User Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {userData.first_name?.[0]}{userData.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{userData.full_name}</h3>
                <p className="text-muted-foreground">{userData.email}</p>
                <Badge variant="outline">{userData.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editedUser?.first_name || ''}
                  onChange={(e) => setEditedUser(prev => prev ? { ...prev, first_name: e.target.value, full_name: `${e.target.value} ${prev.last_name}` } : null)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editedUser?.last_name || ''}
                  onChange={(e) => setEditedUser(prev => prev ? { ...prev, last_name: e.target.value, full_name: `${prev.first_name} ${e.target.value}` } : null)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={editedUser?.email || ''}
                  onChange={(e) => setEditedUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="pl-10"
                />
              </div>
              {userData.functional_email && (
                <p className="text-sm text-muted-foreground mt-1">
                  Personal Email: {userData.personal_email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={editedUser?.phone_number || ''}
                  onChange={(e) => setEditedUser(prev => prev ? { ...prev, phone_number: e.target.value } : null)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Select
                  value={editedUser?.company || ''}
                  onValueChange={(value) => setEditedUser(prev => prev ? { ...prev, company: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.value} value={company.value}>
                        <div className="flex items-center gap-2">
                          {company.logo && <img src={company.logo} alt={company.value} className="w-4 h-4" />}
                          {company.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={editedUser?.job_title || ''}
                  onChange={(e) => setEditedUser(prev => prev ? { ...prev, job_title: e.target.value } : null)}
                />
              </div>
            </div>

            {editedUser?.ta2_discipline && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>TA2 Discipline</Label>
                  <Input value={editedUser.ta2_discipline} disabled />
                </div>
                <div>
                  <Label>TA2 Commission</Label>
                  <Input value={editedUser.ta2_commission || ''} disabled />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privilege Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Assign User Privileges
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select the privileges that this user should have in the ORSH platform.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {privilegeOptions.map((privilege) => (
                <div key={privilege.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={privilege.value}
                    checked={selectedPrivileges.includes(privilege.value)}
                    onCheckedChange={(checked) => handlePrivilegeChange(privilege.value, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={privilege.value} className="font-medium cursor-pointer">
                      {privilege.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{privilege.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedPrivileges.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Selected Privileges:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPrivileges.map((privilege) => {
                    const option = privilegeOptions.find(p => p.value === privilege);
                    return (
                      <Badge key={privilege} variant="secondary">
                        {option?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setShowRejectionDialog(true)}
            disabled={submitting}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject Request
          </Button>
          
          <Button
            onClick={handleApprove}
            disabled={submitting || selectedPrivileges.length === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {submitting ? 'Processing...' : 'Approve Request'}
          </Button>
        </div>

        {/* Rejection Dialog */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject User Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Please provide a reason for rejecting this user request:</p>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="h-24"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={submitting || !rejectionReason.trim()}
                >
                  {submitting ? 'Rejecting...' : 'Reject Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approval Success Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                User Request Approved
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The user has been successfully authenticated and login credentials have been sent to their email address.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button onClick={onComplete}>
                  OK
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserAuthenticationPage;