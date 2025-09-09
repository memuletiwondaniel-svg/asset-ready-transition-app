import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, ArrowLeft, ArrowRight, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Data for dropdowns
const companies = [
  { value: 'bgc', label: 'BGC' },
  { value: 'kent', label: 'Kent' },
  { value: 'other', label: 'Others (specify)' }
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

const disciplines = [
  'Civil',
  'Static',
  'PACO',
  'Process',
  'Technical Safety'
];

const commissions = [
  'Asset',
  'Project and Engineering'
];

const projects = [
  'BGC Alpha Project',
  'BGC Beta Project',
  'BGC Gamma Project',
  'Kent Delta Project',
  'Kent Epsilon Project',
  'Infrastructure Upgrade',
  'Safety Enhancement Project',
  'Digital Transformation Initiative'
];

const authenticators = [
  { id: 'daniel-memuletiwon', name: 'Daniel Memuletiwon (ORA Lead)', isDefault: true },
  { id: 'john-smith', name: 'John Smith (Plant Director)' },
  { id: 'sarah-wilson', name: 'Sarah Wilson (HSE Director)' },
  { id: 'mike-johnson', name: 'Mike Johnson (P&E Director)' }
];

interface SignUpStep2Props {}

const SignUpStep2: React.FC<SignUpStep2Props> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  // Get form data from navigation state
  const step1Data = location.state?.formData || {};
  
  const [step2Data, setStep2Data] = useState({
    company: '',
    companyOther: '',
    userRole: '',
    userRoleOther: '',
    discipline: '',
    commission: '',
    projects: [],
    authenticator: 'daniel-memuletiwon',
    ...step1Data // Merge step 1 data
  });

  const [openPopovers, setOpenPopovers] = useState({
    role: false,
    project: false,
    authenticator: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Set default authenticator for new users (non-admin)
    if (!isAdmin && !step2Data.authenticator) {
      setStep2Data(prev => ({ ...prev, authenticator: 'daniel-memuletiwon' }));
    }
  }, [isAdmin]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setStep2Data(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!step2Data.company) {
      newErrors.company = 'Company selection is required';
    }
    
    if (step2Data.company === 'other' && !step2Data.companyOther) {
      newErrors.companyOther = 'Please specify the company';
    }
    
    if (!step2Data.userRole) {
      newErrors.userRole = 'User role selection is required';
    }
    
    if (step2Data.userRole === 'Others (specify)' && !step2Data.userRoleOther) {
      newErrors.userRoleOther = 'Please specify the role';
    }
    
    if (step2Data.userRole === 'Technical Authority (TA2)') {
      if (!step2Data.discipline) {
        newErrors.discipline = 'Discipline is required for TA2 role';
      }
      if (!step2Data.commission) {
        newErrors.commission = 'Commission is required for TA2 role';
      }
    }
    
    if (!isAdmin && !step2Data.authenticator) {
      newErrors.authenticator = 'Authenticator selection is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = () => {
    navigate('/auth');
  };

  const handleReviewRequest = () => {
    if (validateForm()) {
      navigate('/signup/review', { state: { formData: step2Data } });
    }
  };

  const toggleProjectSelection = (project: string) => {
    const currentProjects = step2Data.projects || [];
    const updatedProjects = currentProjects.includes(project)
      ? currentProjects.filter(p => p !== project)
      : [...currentProjects, project];
    
    handleInputChange('projects', updatedProjects);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" 
                 style={{ animationDelay: `${Math.random() * 2}s` }} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
            alt="BGC Logo" 
            className="h-16 w-auto mx-auto mb-4" 
          />
          <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">Step 2 of 2 - Additional Information</p>
        </div>

        <Card className="shadow-lg backdrop-blur-sm bg-card/95 border-2">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6" />
              Professional Details
            </CardTitle>
            <CardDescription className="text-center">
              Please provide your work-related information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Select value={step2Data.company} onValueChange={(value) => handleInputChange('company', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your company" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {companies.map((company) => (
                    <SelectItem key={company.value} value={company.value}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {step2Data.company === 'other' && (
                <Input
                  placeholder="Please specify your company"
                  value={step2Data.companyOther}
                  onChange={(e) => handleInputChange('companyOther', e.target.value)}
                  className="mt-2"
                />
              )}
              {errors.company && <p className="text-sm text-destructive">{errors.company}</p>}
              {errors.companyOther && <p className="text-sm text-destructive">{errors.companyOther}</p>}
            </div>

            {/* User Role Selection */}
            <div className="space-y-2">
              <Label>User Role *</Label>
              <Popover open={openPopovers.role} onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, role: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopovers.role}
                    className="w-full justify-between"
                  >
                    {step2Data.userRole || "Select user role..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search roles..." />
                    <CommandList>
                      <CommandEmpty>No role found.</CommandEmpty>
                      <CommandGroup>
                        {userRoles.map((role) => (
                          <CommandItem
                            key={role}
                            value={role}
                            onSelect={() => {
                              handleInputChange('userRole', role);
                              setOpenPopovers(prev => ({ ...prev, role: false }));
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                step2Data.userRole === role ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {role}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {step2Data.userRole === 'Others (specify)' && (
                <Input
                  placeholder="Please specify your role"
                  value={step2Data.userRoleOther}
                  onChange={(e) => handleInputChange('userRoleOther', e.target.value)}
                  className="mt-2"
                />
              )}
              {errors.userRole && <p className="text-sm text-destructive">{errors.userRole}</p>}
              {errors.userRoleOther && <p className="text-sm text-destructive">{errors.userRoleOther}</p>}
            </div>

            {/* TA2 Specific Fields */}
            {step2Data.userRole === 'Technical Authority (TA2)' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-accent/10 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="discipline">Discipline *</Label>
                  <Select value={step2Data.discipline} onValueChange={(value) => handleInputChange('discipline', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discipline" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {disciplines.map((discipline) => (
                        <SelectItem key={discipline} value={discipline}>
                          {discipline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.discipline && <p className="text-sm text-destructive">{errors.discipline}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission *</Label>
                  <Select value={step2Data.commission} onValueChange={(value) => handleInputChange('commission', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select commission" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {commissions.map((commission) => (
                        <SelectItem key={commission} value={commission}>
                          {commission}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.commission && <p className="text-sm text-destructive">{errors.commission}</p>}
                </div>
              </div>
            )}

            {/* Project Selection */}
            <div className="space-y-2">
              <Label>Projects (Optional)</Label>
              <Popover open={openPopovers.project} onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, project: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openPopovers.project}
                    className="w-full justify-between"
                  >
                    {step2Data.projects?.length > 0 
                      ? `${step2Data.projects.length} project(s) selected`
                      : "Select projects..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandList>
                      <CommandEmpty>No project found.</CommandEmpty>
                      <CommandGroup>
                        {projects.map((project) => (
                          <CommandItem
                            key={project}
                            value={project}
                            onSelect={() => toggleProjectSelection(project)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                step2Data.projects?.includes(project) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {project}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {step2Data.projects?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {step2Data.projects.map((project) => (
                    <span
                      key={project}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      {project}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Authenticator Selection (only for non-admin users) */}
            {!isAdmin && (
              <div className="space-y-2">
                <Label>Authenticator *</Label>
                <Popover open={openPopovers.authenticator} onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, authenticator: open }))}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPopovers.authenticator}
                      className="w-full justify-between"
                    >
                      {authenticators.find(auth => auth.id === step2Data.authenticator)?.name || "Select authenticator..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search authenticators..." />
                      <CommandList>
                        <CommandEmpty>No authenticator found.</CommandEmpty>
                        <CommandGroup>
                          {authenticators.map((authenticator) => (
                            <CommandItem
                              key={authenticator.id}
                              value={authenticator.name}
                              onSelect={() => {
                                handleInputChange('authenticator', authenticator.id);
                                setOpenPopovers(prev => ({ ...prev, authenticator: false }));
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  step2Data.authenticator === authenticator.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {authenticator.name}
                              {authenticator.isDefault && (
                                <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.authenticator && <p className="text-sm text-destructive">{errors.authenticator}</p>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1 group"
              >
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReviewRequest}
                className="flex-1 group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10">Review Request</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 relative z-10" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUpStep2;