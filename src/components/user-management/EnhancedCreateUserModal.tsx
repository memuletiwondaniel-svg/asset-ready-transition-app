import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Phone, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useHubs } from '@/hooks/useHubs';
import { useCategorizedRoles } from '@/hooks/useCategorizedRoles';

interface PhoneNumber {
  countryCode: string;
  number: string;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  isFunctionalEmail: boolean;
  personalEmail: string;
  phoneNumbers: PhoneNumber[];
  company: string;
  customCompany: string;
  function: string;
  role: string;
  customRole: string;
  commission?: string;
  hub: string;
  associatedProjects: string[];
  authenticator: string;
}

interface EnhancedCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (userData: any) => void;
  isAdminCreated: boolean; // Determines if admin is creating or user self-registering
}

const EnhancedCreateUserModal: React.FC<EnhancedCreateUserModalProps> = ({
  isOpen,
  onClose,
  onCreateUser,
  isAdminCreated,
}) => {
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    isFunctionalEmail: false,
    personalEmail: '',
    phoneNumbers: [{ countryCode: '+964', number: '' }],
    company: '',
    customCompany: '',
    function: '',
    role: '',
    customRole: '',
    commission: '',
    hub: '',
    associatedProjects: [],
    authenticator: 'Daniel Memuletiwon',
  });

  const { data: hubs } = useHubs();
  const { data: categorizedRoles, isLoading: rolesLoading } = useCategorizedRoles();

  // Get roles for the selected function
  const getRolesForFunction = () => {
    if (!formData.function || !categorizedRoles) return [];
    const functionGroup = categorizedRoles.find(g => g.category.name === formData.function);
    return functionGroup?.roles || [];
  };

  const [emailError, setEmailError] = useState('');

  const countryCodes = [
    { code: '+964', country: 'Iraq', flag: '🇮🇶' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
  ];

  const companies = [
    { value: 'BGC', label: 'BGC', logo: '/lovable-uploads/5d0026a9-ed76-4745-9f0f-6a8a5e37993c.png' },
    { value: 'Kent', label: 'Kent', logo: '/lovable-uploads/96910863-cffb-404b-b5f0-149d393a07df.png' },
    { value: 'Others', label: 'Others' }
  ];

  // Commission options
  const commissions = ['Asset', 'Project and Engineering'];
  const ta2Commissions = ['Project', 'Asset'];

  // Check if TA2 role should show commission field (exclude Civil TA2 and Tech Safety TA2)
  const shouldShowTA2Commission = (role: string) => {
    const excludedTA2Roles = ['Civil TA2', 'Tech Safety TA2'];
    return role.includes('TA2') && !excludedTA2Roles.includes(role);
  };

  // Filter commissions for specific roles
  const getFilteredCommissions = () => {
    if (formData.role === 'Engr. Manager' || formData.role === 'HSE Manager') {
      return commissions;
    }
    return commissions;
  };

  // Filter hubs for specific roles
  const getFilteredHubs = () => {
    if (formData.role === 'ORA Engr.' || formData.role === 'ORA Lead') {
      return hubs?.filter(h => ['North', 'Central', 'South'].includes(h.name)) || [];
    }
    return hubs || [];
  };

  const projects = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Project Delta'];
  const authenticators = [
    'Daniel Memuletiwon (ORA Lead)',
    'Ahmed Al-Rashid (Plant Director)',
    'Sarah Mitchell (TA2)',
  ];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (email: string, isPersonal: boolean = false) => {
    if (isPersonal) {
      setFormData(prev => ({ ...prev, personalEmail: email }));
    } else {
      setFormData(prev => ({ ...prev, email }));
      validateEmail(email);
    }
  };

  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { countryCode: '+964', number: '' }]
    }));
  };

  const removePhoneNumber = (index: number) => {
    if (formData.phoneNumbers.length > 1) {
      setFormData(prev => ({
        ...prev,
        phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePhoneNumber = (index: number, field: 'countryCode' | 'number', value: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) =>
        i === index ? { ...phone, [field]: value } : phone
      )
    }));
  };

  const toggleProject = (project: string) => {
    setFormData(prev => ({
      ...prev,
      associatedProjects: prev.associatedProjects.includes(project)
        ? prev.associatedProjects.filter(p => p !== project)
        : [...prev.associatedProjects, project]
    }));
  };

  // Check if role requires hub selection
  const requiresHub = (role: string) => {
    return ['Project Manager', 'Project Engr', 'Commissioning Lead', 'Construction Lead', 'ORA Engr.', 'ORA Lead'].includes(role);
  };

  const getPositionTitle = () => {
    if (!formData.role) return '';
    
    const rolesThatRequireHub = ['Project Manager', 'Project Engr', 'Commissioning Lead', 'Construction Lead', 'ORA Engr.', 'ORA Lead'];
    
    if (rolesThatRequireHub.includes(formData.role) && formData.hub) {
      return `${formData.role} – ${formData.hub}`;
    }
    
    if (formData.role === 'HSE Manager' && formData.commission) {
      return `HSE Manager - ${formData.commission}`;
    }
    
    return formData.role;
  };

  // Generate position based on role and hub
  const generatePosition = () => {
    const { role, hub } = formData;
    if (!role || !hub) return '';
    
    switch (role) {
      case 'Proj Manager':
        return `Proj Manager – ${hub}`;
      case 'Proj Engr':
        return `Proj Engr – ${hub}`;
      case 'Commissioning Lead':
        return `Commissioning Lead – ${hub}`;
      case 'Construction Lead':
        return `Construction Lead – ${hub}`;
      default:
        return '';
    }
  };

  const handleSubmit = () => {
    if (step === 'form') {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      if (!validateEmail(formData.email)) {
        return;
      }

      if (formData.isFunctionalEmail && !formData.personalEmail) {
        toast({
          title: "Missing Personal Email",
          description: "Please provide a personal email address.",
          variant: "destructive",
        });
        return;
      }

      if (formData.isFunctionalEmail && !validateEmail(formData.personalEmail)) {
        return;
      }

      setStep('review');
    } else {
      // Confirm and create user
      const userData = {
        ...formData,
        company: formData.company === 'Others' ? formData.customCompany : formData.company,
        role: formData.role === 'Others' ? formData.customRole : formData.role,
        position: generatePosition(),
        status: isAdminCreated ? 'new' : 'awaiting authentication',
        createdBy: isAdminCreated ? 'admin' : 'self',
        privileges: [], // Will be assigned by authenticator
        pendingActions: 0,
      };

      onCreateUser(userData);
      
      if (isAdminCreated) {
        toast({
          title: "User Created",
          description: "New user has been created and login credentials will be sent.",
        });
      } else {
        toast({
          title: "Registration Submitted",
          description: "Your request has been submitted for approval. You will receive an email once approved.",
        });
      }

      handleClose();
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      isFunctionalEmail: false,
      personalEmail: '',
      phoneNumbers: [{ countryCode: '+964', number: '' }],
      company: '',
      customCompany: '',
      function: '',
      role: '',
      customRole: '',
      commission: '',
      hub: '',
      associatedProjects: [],
      authenticator: 'Daniel Memuletiwon',
    });
    setEmailError('');
    onClose();
  };

  const renderForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="user@company.com"
              className={emailError ? "border-red-500" : ""}
            />
            {emailError && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {emailError}
              </p>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="functional-email"
                checked={formData.isFunctionalEmail}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, isFunctionalEmail: checked as boolean }))
                }
              />
              <Label htmlFor="functional-email" className="text-sm">
                This is a functional email
              </Label>
            </div>
          </div>

          {formData.isFunctionalEmail && (
            <div>
              <Label htmlFor="personalEmail">Personal Email Address *</Label>
              <Input
                id="personalEmail"
                type="email"
                value={formData.personalEmail}
                onChange={(e) => handleEmailChange(e.target.value, true)}
                placeholder="personal@gmail.com"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Phone Numbers
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhoneNumber}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Phone
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.phoneNumbers.map((phone, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={phone.countryCode}
                onValueChange={(value) => updatePhoneNumber(index, 'countryCode', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map(({ code, country, flag }) => (
                    <SelectItem key={code} value={code}>
                      {flag} {code} - {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                value={phone.number}
                onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                placeholder="Phone number"
                className="flex-1"
              />
              {formData.phoneNumbers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePhoneNumber(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Company and Role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company & Role Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Company *</Label>
            <Select
              value={formData.company}
              onValueChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(company => (
                  <SelectItem key={company.value} value={company.value}>
                    <div className="flex items-center gap-2">
                      {company.logo && <img src={company.logo} alt={company.value} className="w-4 h-4" />}
                      {company.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.company === 'Others' && (
              <Input
                className="mt-2"
                value={formData.customCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, customCompany: e.target.value }))}
                placeholder="Specify company name"
              />
            )}
          </div>

          <div>
            <Label>Function *</Label>
            <Select
              value={formData.function}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                function: value,
                role: '' // Reset role when function changes
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={rolesLoading ? "Loading..." : "Select function"} />
              </SelectTrigger>
              <SelectContent>
                {categorizedRoles?.map((group) => (
                  <SelectItem key={group.category.id} value={group.category.name}>
                    {group.category.name}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              disabled={!formData.function}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.function ? "Select role" : "Select function first"} />
              </SelectTrigger>
              <SelectContent>
                {formData.function === 'Other' ? (
                  <SelectItem value="Others (specify)">Others (specify)</SelectItem>
                ) : (
                  getRolesForFunction().map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {formData.role === 'Others (specify)' && (
              <Input
                className="mt-2"
                value={formData.customRole}
                onChange={(e) => setFormData(prev => ({ ...prev, customRole: e.target.value }))}
                placeholder="Specify role"
              />
            )}
          </div>

          {requiresHub(formData.role) && (
            <div>
              <Label>Hub *</Label>
              <Select
                value={formData.hub}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hub: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.role === 'ORA Engineer' ? "Select hub (North, Central, or South)" : "Select hub"} />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredHubs().map(hub => (
                    <SelectItem key={hub.id} value={hub.name}>{hub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {['Engr. Manager', 'HSE Manager'].includes(formData.role) && (
            <div>
              <Label>Commission *</Label>
              <Select
                value={formData.commission}
                onValueChange={(value) => setFormData(prev => ({ ...prev, commission: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select commission (P&E or Asset only)" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredCommissions().map(commission => (
                    <SelectItem key={commission} value={commission}>{commission}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {shouldShowTA2Commission(formData.role) && (
            <div>
              <Label>Commission *</Label>
              <Select
                value={formData.commission}
                onValueChange={(value) => setFormData(prev => ({ ...prev, commission: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select commission" />
                </SelectTrigger>
                <SelectContent>
                  {ta2Commissions.map(commission => (
                    <SelectItem key={commission} value={commission}>{commission}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Association (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {projects.map(project => (
              <div key={project} className="flex items-center space-x-2">
                <Checkbox
                  id={`project-${project}`}
                  checked={formData.associatedProjects.includes(project)}
                  onCheckedChange={() => toggleProject(project)}
                />
                <Label htmlFor={`project-${project}`} className="text-sm">
                  {project}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Authenticator Selection - Only for self-registration */}
      {!isAdminCreated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authenticator</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.authenticator}
              onValueChange={(value) => setFormData(prev => ({ ...prev, authenticator: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {authenticators.map(authenticator => (
                  <SelectItem key={authenticator} value={authenticator}>
                    {authenticator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Review Your Information</h3>
        <p className="text-blue-700 text-sm">
          Please review all the information below before submitting your {isAdminCreated ? 'user creation' : 'registration'} request.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Name:</span>
              <p className="text-sm">{formData.firstName} {formData.lastName}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Email:</span>
              <p className="text-sm">{formData.email}</p>
              {formData.isFunctionalEmail && (
                <p className="text-xs text-gray-500">
                  Personal: {formData.personalEmail}
                </p>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Phone Numbers:</span>
            {formData.phoneNumbers.map((phone, index) => (
              <p key={index} className="text-sm">{phone.countryCode} {phone.number}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Company:</span>
              <p className="text-sm">{formData.company === 'Others' ? formData.customCompany : formData.company}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Role:</span>
              <p className="text-sm">{formData.role === 'Others' ? formData.customRole : formData.role}</p>
              {formData.role.includes('TA2') && formData.commission && (
                <p className="text-xs text-gray-500">Commission: {formData.commission}</p>
              )}
            </div>
          </div>
          {formData.associatedProjects.length > 0 && (
            <div>
              <span className="text-sm font-medium">Associated Projects:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.associatedProjects.map(project => (
                  <Badge key={project} variant="secondary" className="text-xs">
                    {project}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {!isAdminCreated && (
            <div>
              <span className="text-sm font-medium">Authenticator:</span>
              <p className="text-sm">{formData.authenticator}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'form' ? (
              <>
                <Mail className="h-5 w-5" />
                {isAdminCreated ? 'Create New User' : 'New User Registration'}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Review Registration
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? renderForm() : renderReview()}

        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          {step === 'review' && (
            <Button variant="outline" onClick={() => setStep('form')}>
              Back to Form
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {step === 'form' ? 'Review Request' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedCreateUserModal;