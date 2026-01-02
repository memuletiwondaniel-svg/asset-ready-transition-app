import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CheckCircle, XCircle, User, Mail, Phone, Building } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    '+964': '🇮🇶',
    '+965': '🇰🇼',
    '+966': '🇸🇦',
    '+971': '🇦🇪',
    '+1': '🇺🇸',
    '+44': '🇬🇧',
    '+33': '🇫🇷',
    '+49': '🇩🇪'
  };
  return flags[countryCode] || '🏳️';
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isFunctionalEmail?: boolean;
  personalEmail?: string;
  phoneNumbers: Array<{ countryCode: string; number: string }>;
  company: string;
  role: string;
  discipline?: string;
  commission?: string;
  associatedProjects: string[];
  authenticator?: string;
  status: string;
  createdBy?: string;
  createdAt: string;
}

interface AuthenticatorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onApprove: (userId: string, privileges: string[], userData: any) => void;
  onReject: (userId: string, reason: string) => void;
}

const AuthenticatorApprovalModal: React.FC<AuthenticatorApprovalModalProps> = ({
  isOpen,
  onClose,
  user,
  onApprove,
  onReject,
}) => {
  const [action, setAction] = useState<'review' | 'approve' | 'reject'>('review');
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editedUser, setEditedUser] = useState<any>(null);

  React.useEffect(() => {
    if (user) {
      setEditedUser({ ...user });
      setSelectedPrivileges([]);
      setRejectionReason('');
      setAction('review');
    }
  }, [user]);

  const availablePrivileges = [
    'Complete assigned tasks or delegate',
    'Edit PSSR Checklist item Default approvers and PSSR Approvers',
    'Edit, Create or Authenticate New User',
    'Edit or Create New Project',
    'Edit or Create New PSSR Master Checklist',
    'Create or Approve Operation Readiness Plan',
    'Create or Approve Training Plan',
    'Create or Approve PAC or PAC line Item',
    'Create or Approve FAC or FAC line Item'
  ];

  const companies = ['BGC', 'Kent', 'Others'];
  const roles = [
    'Project Manager',
    'Commissioning Lead',
    'Construction Lead',
    'Technical Authority (TA2)',
    'Plant Director',
    'Deputy Plant Director',
    'Operations Coach',
    'Operation Readiness & Assurance Engineer',
    'Site Engineer',
    'Ops HSE Lead',
    'Project HSE Lead',
    'ER Lead',
    'P&M Director',
    'HSE Director',
    'P&E Director'
  ];

  const disciplines = ['Civil', 'Static', 'PACO', 'Process', 'Technical Safety'];
  const commissions = ['Asset', 'Project and Engineering'];

  const togglePrivilege = (privilege: string) => {
    setSelectedPrivileges(prev =>
      prev.includes(privilege)
        ? prev.filter(p => p !== privilege)
        : [...prev, privilege]
    );
  };

  const handleApprove = () => {
    if (selectedPrivileges.length === 0) {
      toast({
        title: "No Privileges Selected",
        description: "Please assign at least one privilege to the user.",
        variant: "destructive",
      });
      return;
    }

    onApprove(editedUser.id, selectedPrivileges, editedUser);
    toast({
      title: "User Approved",
      description: "User has been approved and login credentials will be sent.",
    });
    onClose();
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this user request.",
        variant: "destructive",
      });
      return;
    }

    onReject(editedUser.id, rejectionReason);
    toast({
      title: "User Request Rejected",
      description: "User has been notified of the rejection.",
    });
    onClose();
  };

  if (!user || !editedUser) return null;

  const renderReviewStep = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input
                value={editedUser.firstName}
                onChange={(e) => setEditedUser(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={editedUser.lastName}
                onChange={(e) => setEditedUser(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              type="email"
              value={editedUser.email}
              onChange={(e) => setEditedUser(prev => ({ ...prev, email: e.target.value }))}
            />
            {editedUser.isFunctionalEmail && (
              <div className="mt-2">
                <Label className="text-sm">Personal Email</Label>
                <Input
                  type="email"
                  value={editedUser.personalEmail}
                  onChange={(e) => setEditedUser(prev => ({ ...prev, personalEmail: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Numbers
            </Label>
            {editedUser.phoneNumbers?.map((phone, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={`${getCountryFlag(phone.countryCode)} ${phone.countryCode}`}
                  className="w-24"
                  readOnly
                />
                <Input
                  value={phone.number}
                  onChange={(e) => {
                    const newPhones = [...editedUser.phoneNumbers];
                    newPhones[index].number = e.target.value;
                    setEditedUser(prev => ({ ...prev, phoneNumbers: newPhones }));
                  }}
                  placeholder="Phone number"
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company
              </Label>
              <Select
                value={editedUser.company}
                onValueChange={(value) => setEditedUser(prev => ({ ...prev, company: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={editedUser.role}
                onValueChange={(value) => setEditedUser(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {editedUser.role === 'Technical Authority (TA2)' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discipline</Label>
                <Select
                  value={editedUser.discipline}
                  onValueChange={(value) => setEditedUser(prev => ({ ...prev, discipline: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map(discipline => (
                      <SelectItem key={discipline} value={discipline}>{discipline}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Commission</Label>
                <Select
                  value={editedUser.commission}
                  onValueChange={(value) => setEditedUser(prev => ({ ...prev, commission: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commissions.map(commission => (
                      <SelectItem key={commission} value={commission}>{commission}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {editedUser.associatedProjects && editedUser.associatedProjects.length > 0 && (
            <div>
              <Label>Associated Projects</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {editedUser.associatedProjects.map(project => (
                  <Badge key={project} variant="secondary">{project}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privilege Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Privileges</CardTitle>
          <p className="text-sm text-gray-600">
            Select the privileges that this user should have in the system.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availablePrivileges.map(privilege => (
              <div key={privilege} className="flex items-center space-x-2">
                <Checkbox
                  id={privilege}
                  checked={selectedPrivileges.includes(privilege)}
                  onCheckedChange={() => togglePrivilege(privilege)}
                />
                <Label htmlFor={privilege} className="text-sm">
                  {privilege}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRejectStep = () => (
    <div className="space-y-4">
      <div className="bg-red-50 p-4 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">Reject User Request</h3>
        <p className="text-red-700 text-sm">
          Please provide a detailed reason for rejecting this user request. This will be communicated to the user.
        </p>
      </div>
      <div>
        <Label htmlFor="rejection-reason">Rejection Reason *</Label>
        <Textarea
          id="rejection-reason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Explain why this user request is being rejected..."
          className="min-h-[100px] mt-2"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authenticate New User: {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        {action === 'review' && renderReviewStep()}
        {action === 'reject' && renderRejectStep()}

        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          {action === 'reject' && (
            <Button variant="outline" onClick={() => setAction('review')}>
              Back to Review
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {action === 'review' && (
            <>
              <Button 
                variant="destructive" 
                onClick={() => setAction('reject')}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject Request
              </Button>
              <Button 
                onClick={handleApprove}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Request
              </Button>
            </>
          )}
          {action === 'reject' && (
            <Button 
              variant="destructive" 
              onClick={handleReject}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Confirm Rejection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthenticatorApprovalModal;