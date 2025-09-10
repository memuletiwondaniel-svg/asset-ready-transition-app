import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  UserCheck, 
  MapPin, 
  Search,
  Plus,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RegistrationSuccessModal from './RegistrationSuccessModal';

interface RegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdminCreated?: boolean;
}

interface PhoneNumber {
  id: string;
  countryCode: string;
  number: string;
}

const EnhancedRegistrationForm: React.FC<RegistrationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isAdminCreated = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedUserEmail, setSubmittedUserEmail] = useState('');
  const [authenticators, setAuthenticators] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    isFunctionalEmail: false,
    personalEmail: '',
    phoneNumbers: [{ id: '1', countryCode: '+964', number: '' }] as PhoneNumber[],
    company: '',
    otherCompany: '',
    userRole: '',
    otherRole: '',
    ta2Discipline: '',
    ta2Commission: '',
    selectedProjects: [] as string[],
    authenticatorId: 'default-authenticator',
    comments: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const countryCodees = [
    { code: '+964', country: 'Iraq', flag: '🇮🇶' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' }
  ];

  const companies = [
    { value: 'BGC', label: 'Basrah Gas Company (BGC)', logo: '/lovable-uploads/5d0026a9-ed76-4745-9f0f-6a8a5e37993c.png' },
    { value: 'KENT', label: 'Kent Engineering', logo: '/lovable-uploads/96910863-cffb-404b-b5f0-149d393a07df.png' },
    { value: 'OTHER', label: 'Others (specify)' }
  ];

  const userRoles = [
    'Project Manager',
    'Commissioning Lead',
    'Construction Lead',
    'Technical Authority (TA2)',
    'Plant Director',
    'Deputy Plant Director',
    'Operations Coach',
    'ORA Engineer',
    'Site Engineer',
    'Ops HSE Lead',
    'Project HSE Lead',
    'ER Lead',
    'Production Director',
    'HSE Director',
    'P&E Director',
    'Others (specify)'
  ];

  const ta2Disciplines = [
    'Civil',
    'Static',
    'PACO',
    'Process',
    'Technical Safety'
  ];

  const ta2Commissions = [
    'Asset',
    'Project and Engineering'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchAuthenticators();
      fetchProjects();
    }
  }, [isOpen]);

  const fetchAuthenticators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, job_title')
        .in('job_title', ['ORA Lead', 'Plant Director', 'Deputy Plant Director']);
      
      if (error) throw error;
      
      // Set default authenticator (Daniel Memuletiwon)
      const defaultAuth = { 
        user_id: 'default-authenticator', 
        full_name: 'Daniel Memuletiwon', 
        email: 'daniel.memuletiwon@bgc.com', 
        job_title: 'ORA Lead' 
      };
      
      setAuthenticators([defaultAuth, ...(data || [])]);
    } catch (error) {
      console.error('Error fetching authenticators:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('user_projects')
        .select('project_name')
        .order('project_name');
      
      if (error) throw error;
      
      const uniqueProjects = Array.from(new Set(data?.map(p => p.project_name)));
      setProjects(uniqueProjects.map(name => ({ name, id: name })));
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      
      if (formData.isFunctionalEmail) {
        if (!formData.personalEmail.trim()) {
          newErrors.personalEmail = 'Personal email is required when using functional email';
        } else if (!validateEmail(formData.personalEmail)) {
          newErrors.personalEmail = 'Please enter a valid personal email address';
        }
      }

      formData.phoneNumbers.forEach((phone, index) => {
        if (!phone.number.trim()) {
          newErrors[`phone_${index}`] = 'Phone number is required';
        }
      });
    }

    if (step === 2) {
      if (!formData.company) newErrors.company = 'Company selection is required';
      if (formData.company === 'OTHER' && !formData.otherCompany.trim()) {
        newErrors.otherCompany = 'Please specify the company name';
      }
      
      if (!formData.userRole) newErrors.userRole = 'User role selection is required';
      if (formData.userRole === 'Others (specify)' && !formData.otherRole.trim()) {
        newErrors.otherRole = 'Please specify the role';
      }
      
      if (formData.userRole === 'Technical Authority (TA2)') {
        if (!formData.ta2Discipline) newErrors.ta2Discipline = 'TA2 Discipline is required';
        if (!formData.ta2Commission) newErrors.ta2Commission = 'TA2 Commission is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addPhoneNumber = () => {
    const newPhone: PhoneNumber = {
      id: Date.now().toString(),
      countryCode: '+964',
      number: ''
    };
    setFormData({
      ...formData,
      phoneNumbers: [...formData.phoneNumbers, newPhone]
    });
  };

  const removePhoneNumber = (id: string) => {
    if (formData.phoneNumbers.length > 1) {
      setFormData({
        ...formData,
        phoneNumbers: formData.phoneNumbers.filter(phone => phone.id !== id)
      });
    }
  };

  const updatePhoneNumber = (id: string, field: keyof PhoneNumber, value: string) => {
    setFormData({
      ...formData,
      phoneNumbers: formData.phoneNumbers.map(phone =>
        phone.id === id ? { ...phone, [field]: value } : phone
      )
    });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    try {
      // Create the user registration request
      const userData = {
        user_id: crypto.randomUUID(), // Generate a temporary ID for pending users
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        personal_email: formData.isFunctionalEmail ? formData.personalEmail : null,
        functional_email: formData.isFunctionalEmail,
        phone_number: formData.phoneNumbers[0]?.countryCode + formData.phoneNumbers[0]?.number,
        company: (formData.company === 'OTHER' ? formData.otherCompany : formData.company) as any,
        job_title: formData.userRole === 'Others (specify)' ? formData.otherRole : formData.userRole,
        ta2_discipline: (formData.ta2Discipline || null) as any,
        ta2_commission: (formData.ta2Commission || null) as any,
        status: 'pending_approval' as any, // This will show as "awaiting Authentication" in the UI
        rejection_reason: formData.comments
      };

      // Insert user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert(userData)
        .select()
        .single();

      if (profileError) throw profileError;

      // Send email notification to authenticator if not admin-created
      if (!isAdminCreated) {
        const { error: emailError } = await supabase.functions.invoke('send-user-approval-request', {
          body: {
            authenticatorId: formData.authenticatorId,
            userData: userData,
            requestId: profileData.user_id
          }
        });

        if (emailError) {
          console.error('Email error:', emailError);
          // Don't fail the whole process if email fails
        }
      }

      // Show success modal instead of just closing
      setSubmittedUserEmail(formData.email);
      setShowSuccessModal(true);
      
      // Call onSuccess callback for parent component
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error submitting registration request');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose(); // Close the registration form after success modal is closed
  };

  const filteredRoles = userRoles.filter(role =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStepOne = () => (
    <div className="space-y-6">
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
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="user@company.com"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
            
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="functionalEmail"
                checked={formData.isFunctionalEmail}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isFunctionalEmail: checked as boolean })
                }
              />
              <Label htmlFor="functionalEmail" className="text-sm">
                This is a functional email address
              </Label>
            </div>
          </div>

          {formData.isFunctionalEmail && (
            <div>
              <Label htmlFor="personalEmail">Personal Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                  className={`pl-10 ${errors.personalEmail ? 'border-red-500' : ''}`}
                  placeholder="personal@email.com"
                />
              </div>
              {errors.personalEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.personalEmail}</p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Phone Numbers *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhoneNumber}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Phone
              </Button>
            </div>
            
            {formData.phoneNumbers.map((phone, index) => (
              <div key={phone.id} className="flex items-center space-x-2 mb-2">
                <Select
                  value={phone.countryCode}
                  onValueChange={(value) => updatePhoneNumber(phone.id, 'countryCode', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodees.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={phone.number}
                    onChange={(e) => updatePhoneNumber(phone.id, 'number', e.target.value)}
                    className={`pl-10 ${errors[`phone_${index}`] ? 'border-red-500' : ''}`}
                    placeholder="7XX XXX XXXX"
                  />
                </div>
                
                {formData.phoneNumbers.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePhoneNumber(phone.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Company & Role Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company">Company *</Label>
            <Select
              value={formData.company}
              onValueChange={(value) => setFormData({ ...formData, company: value })}
            >
              <SelectTrigger className={errors.company ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select your company" />
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
            {errors.company && (
              <p className="text-sm text-red-500 mt-1">{errors.company}</p>
            )}
          </div>

          {formData.company === 'OTHER' && (
            <div>
              <Label htmlFor="otherCompany">Specify Company Name *</Label>
              <Input
                id="otherCompany"
                value={formData.otherCompany}
                onChange={(e) => setFormData({ ...formData, otherCompany: e.target.value })}
                className={errors.otherCompany ? 'border-red-500' : ''}
                placeholder="Enter company name"
              />
              {errors.otherCompany && (
                <p className="text-sm text-red-500 mt-1">{errors.otherCompany}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="userRole">User Role *</Label>
            <Select
              value={formData.userRole}
              onValueChange={(value) => setFormData({ ...formData, userRole: value })}
            >
              <SelectTrigger className={errors.userRole ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select user role" />
              </SelectTrigger>
              <SelectContent>
                {userRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userRole && (
              <p className="text-sm text-red-500 mt-1">{errors.userRole}</p>
            )}
          </div>

          {formData.userRole === 'Others (specify)' && (
            <div>
              <Label htmlFor="otherRole">Specify Role *</Label>
              <Input
                id="otherRole"
                value={formData.otherRole}
                onChange={(e) => setFormData({ ...formData, otherRole: e.target.value })}
                className={errors.otherRole ? 'border-red-500' : ''}
                placeholder="Enter role name"
              />
              {errors.otherRole && (
                <p className="text-sm text-red-500 mt-1">{errors.otherRole}</p>
              )}
            </div>
          )}

          {formData.userRole === 'Technical Authority (TA2)' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ta2Discipline">TA2 Discipline *</Label>
                <Select
                  value={formData.ta2Discipline}
                  onValueChange={(value) => setFormData({ ...formData, ta2Discipline: value })}
                >
                  <SelectTrigger className={errors.ta2Discipline ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    {ta2Disciplines.map((discipline) => (
                      <SelectItem key={discipline} value={discipline}>
                        {discipline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ta2Discipline && (
                  <p className="text-sm text-red-500 mt-1">{errors.ta2Discipline}</p>
                )}
              </div>

              <div>
                <Label htmlFor="ta2Commission">TA2 Commission *</Label>
                <Select
                  value={formData.ta2Commission}
                  onValueChange={(value) => setFormData({ ...formData, ta2Commission: value })}
                >
                  <SelectTrigger className={errors.ta2Commission ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select commission" />
                  </SelectTrigger>
                  <SelectContent>
                    {ta2Commissions.map((commission) => (
                      <SelectItem key={commission} value={commission}>
                        {commission}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ta2Commission && (
                  <p className="text-sm text-red-500 mt-1">{errors.ta2Commission}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Projects (Optional)</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2">
              {filteredProjects.map((project) => (
                <div key={project.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                  <Checkbox
                    id={`project_${project.id}`}
                    checked={formData.selectedProjects.includes(project.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          selectedProjects: [...formData.selectedProjects, project.name]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          selectedProjects: formData.selectedProjects.filter(p => p !== project.name)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={`project_${project.id}`} className="text-sm">
                    {project.name}
                  </Label>
                </div>
              ))}
            </div>
            {formData.selectedProjects.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">Selected projects:</p>
                <div className="flex flex-wrap gap-1">
                  {formData.selectedProjects.map((project) => (
                    <Badge key={project} variant="secondary">
                      {project}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => setFormData({
                          ...formData,
                          selectedProjects: formData.selectedProjects.filter(p => p !== project)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isAdminCreated && (
            <div>
              <Label htmlFor="authenticator">Authenticator *</Label>
              <Select
                value={formData.authenticatorId}
                onValueChange={(value) => setFormData({ ...formData, authenticatorId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {authenticators.map((auth) => (
                    <SelectItem key={auth.user_id} value={auth.user_id}>
                      <div className="flex items-center">
                        <UserCheck className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{auth.full_name}</div>
                          <div className="text-xs text-muted-foreground">{auth.job_title}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="comments">Additional Comments (Optional)</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Any additional information or special requests..."
              className="h-20"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Review Registration Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              <p>{formData.firstName} {formData.lastName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p>{formData.email}</p>
              {formData.isFunctionalEmail && (
                <p className="text-xs text-muted-foreground">
                  Personal: {formData.personalEmail}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
              {formData.phoneNumbers.map((phone, index) => (
                <p key={phone.id} className="text-sm">
                  {phone.countryCode} {phone.number}
                </p>
              ))}
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Company</Label>
              <p>{formData.company === 'OTHER' ? formData.otherCompany : formData.company}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Role</Label>
              <p>{formData.userRole === 'Others (specify)' ? formData.otherRole : formData.userRole}</p>
              {formData.userRole === 'Technical Authority (TA2)' && (
                <div className="text-xs text-muted-foreground">
                  <p>Discipline: {formData.ta2Discipline}</p>
                  <p>Commission: {formData.ta2Commission}</p>
                </div>
              )}
            </div>
            {formData.selectedProjects.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Projects</Label>
                <div className="flex flex-wrap gap-1">
                  {formData.selectedProjects.map((project) => (
                    <Badge key={project} variant="outline" className="text-xs">
                      {project}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isAdminCreated && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Authenticator</Label>
              <p>{authenticators.find(a => a.user_id === formData.authenticatorId)?.full_name}</p>
            </div>
          )}

          {formData.comments && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Comments</Label>
              <p className="text-sm">{formData.comments}</p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isAdminCreated 
                ? "The user account will be created immediately upon confirmation."
                : "Upon confirmation, this request will be sent to the authenticator for approval. If approved, login credentials will be sent to the user's email address."
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isAdminCreated ? 'Create New User' : 'Create Your Account'}
          </DialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      currentStep > step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of 3: {
              currentStep === 1 ? 'Personal Information' :
              currentStep === 2 ? 'Company & Role' :
              'Review & Confirm'
            }
          </div>
        </DialogHeader>

        <div className="mt-6">
          {currentStep === 1 && renderStepOne()}
          {currentStep === 2 && renderStepTwo()}
          {currentStep === 3 && renderReviewStep()}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div>
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Confirm Request'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Success Modal */}
    <RegistrationSuccessModal
      isOpen={showSuccessModal}
      onClose={handleSuccessModalClose}
      userEmail={submittedUserEmail}
      isAdminCreated={isAdminCreated}
    />
    </>
  );
};

export default EnhancedRegistrationForm;