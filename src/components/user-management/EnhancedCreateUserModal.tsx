import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import { Plus, X, Phone, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useHubs } from '@/hooks/useHubs';
import { useLocations } from '@/hooks/useLocations';
import { useCategorizedRoles, useRoleCategories, useAddRole, useAddRoleCategory } from '@/hooks/useCategorizedRoles';
import { 
  requiresPortfolio as roleRequiresPortfolio, 
  requiresHub as roleRequiresHubAssignment,
  hasNoAssignment,
  PORTFOLIO_REGIONS 
} from '@/utils/roleAssignmentConfig';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLogActivity } from '@/hooks/useActivityLogs';

// Generate a random password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

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
  portfolio?: string; // Region: North, Central, South
  hub: string;
  plant_id?: string;
  field_id?: string;
  station_id?: string;
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
  const [isCreating, setIsCreating] = useState(false);
  const logActivityMutation = useLogActivity();
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
    portfolio: '',
    hub: '',
    authenticator: 'Daniel Memuletiwon',
  });

  const { data: hubs } = useHubs();
  const { plants, fields, stations, getFieldsByPlant, getStationsByField, isLoading: locationsLoading } = useLocations();

  // Get plant name by ID
  const getPlantName = (plantId: string) => {
    return plants.find(p => p.id === plantId)?.name || '';
  };

  // Get field name by ID
  const getFieldName = (fieldId: string) => {
    return fields.find(f => f.id === fieldId)?.name || '';
  };

  // Get station name by ID
  const getStationName = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.name || '';
  };

  // Check if selected field has any stations linked (for CS plant hierarchy)
  const fieldHasStations = (fieldId: string) => {
    if (!fieldId) return false;
    return getStationsByField(fieldId).length > 0;
  };

  // Check if role requires direct station selection (Site Engr.)
  const roleRequiresStation = (role: string) => {
    return role === 'Site Engr.';
  };

  // Check if role should show station selector when in CS plant with field selected
  // Ops Coach does NOT require station - they work at field level
  const roleRequiresStationInHierarchy = (role: string) => {
    return ['Ops Team Lead', 'Section Head'].includes(role);
  };

  const { data: categorizedRoles, isLoading: rolesLoading } = useCategorizedRoles();
  const { data: roleCategories } = useRoleCategories();
  const { addRole } = useAddRole();
  const { addCategory } = useAddRoleCategory();
  const queryClient = useQueryClient();

  // Add New Role Dialog State
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleFunctionId, setNewRoleFunctionId] = useState('');
  const [showAddFunctionInput, setShowAddFunctionInput] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);

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
    if (formData.role === 'Engr. Manager') {
      return commissions;
    }
    return commissions;
  };

  // Get hubs filtered by selected portfolio (region)
  const getHubsForPortfolio = () => {
    if (!formData.portfolio) return [];
    // Return hubs that belong to the selected portfolio/region
    // For now, return all hubs except the portfolio regions themselves
    return hubs?.filter(h => !PORTFOLIO_REGIONS.includes(h.name)) || [];
  };

  
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


  // Check if role requires hub selection (uses imported config)
  const requiresHub = (role: string) => {
    return roleRequiresHubAssignment(role);
  };

  // Check if role requires portfolio selection (uses imported config)
  const requiresPortfolioSelection = (role: string) => {
    return roleRequiresPortfolio(role);
  };

  // Check if role requires plant selection (Plant Director, Dep. Plant Director only - they stop at plant)
  const requiresPlant = (role: string) => {
    return ['Plant Director', 'Dep. Plant Director', 'Ops Team Lead', 'Ops Coach', 'Section Head'].includes(role);
  };

  // Check if role requires field selection (for operations roles in CS plant)
  const requiresField = (role: string) => {
    return ['Ops Team Lead', 'Ops Coach', 'Section Head'].includes(role);
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

  // Generate position based on role and contextual fields
  const generatePosition = () => {
    const { role, hub, portfolio, commission, plant_id, station_id, field_id } = formData;
    if (!role) return '';
    
    const plantName = getPlantName(plant_id || '');
    const fieldName = getFieldName(field_id || '');
    const stationName = getStationName(station_id || '');
    
    // Roles that require portfolio + hub (e.g., Project Hub Lead, Project Engr)
    // Display only Role - Hub (without portfolio/region name)
    if (requiresHub(role) && portfolio && hub) {
      return `${role} – ${hub}`;
    }
    
    // Roles that require only portfolio (e.g., Project Manager, ORA Engr)
    if (requiresPortfolioSelection(role) && !requiresHub(role) && portfolio) {
      return `${role} – ${portfolio}`;
    }
    
    // Engineering TA2 roles with commission (exclude Civil TA2 and Tech Safety TA2)
    const ta2RolesWithCommission = ['Elect TA2', 'Rotating TA2', 'PACO TA2', 'Static TA2', 'Process TA2'];
    if (ta2RolesWithCommission.includes(role) && commission) {
      return `${role} - ${commission}`;
    }
    
    // Civil TA2, Tech Safety TA2, and HSE Manager - no drill-down needed
    if (['Civil TA2', 'Tech Safety TA2', 'HSE Manager'].includes(role)) {
      return role;
    }
    
    // Engr. Manager with commission
    if (role === 'Engr. Manager' && commission) {
      return `${role} - ${commission}`;
    }
    
    // Plant Director and Dep. Plant Director - stop at plant
    if (['Plant Director', 'Dep. Plant Director'].includes(role) && plantName) {
      return `${role} - ${plantName}`;
    }
    
    // Site Engr. requires station directly
    if (role === 'Site Engr.' && stationName) {
      return `Site Engr. - ${stationName}`;
    }
    
    // Ops Coach and Ops Team Lead with field
    if (['Ops Coach', 'Ops Team Lead'].includes(role) && fieldName) {
      return `${role} - ${fieldName}`;
    }
    
    // Section Head with field
    if (role === 'Section Head' && fieldName) {
      return `Section Head - ${fieldName}`;
    }
    
    // Default: just return the role name for roles without additional context
    return role;
  };

  const handleSubmit = async () => {
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

      // Validate plant for roles that require it
      if (requiresPlant(formData.role) && !formData.plant_id) {
        toast({
          title: "Missing Plant",
          description: "Please select a plant.",
          variant: "destructive",
        });
        return;
      }

      // Check if selected plant is CS or KAZ
      const selectedPlantName = getPlantName(formData.plant_id || '');
      const isCSPlant = selectedPlantName === 'CS';
      const isKAZPlant = selectedPlantName === 'KAZ';

      // Validate field selection when CS or KAZ plant is selected for operations roles that require field
      if (requiresField(formData.role) && (isCSPlant || isKAZPlant) && !formData.field_id) {
        toast({
          title: isKAZPlant ? "Missing Section" : "Missing Field",
          description: isKAZPlant 
            ? "Please select a section for KAZ plant." 
            : "Please select a field for Compression Station.",
          variant: "destructive",
        });
        return;
      }

      // Validate station selection when field requires station (for ops roles with CS plant, except Ops Coach)
      if (roleRequiresStationInHierarchy(formData.role) && isCSPlant && fieldHasStations(formData.field_id || '') && !formData.station_id) {
        toast({
          title: "Missing Station",
          description: `Please select a station for ${getFieldName(formData.field_id || '')}.`,
          variant: "destructive",
        });
        return;
      }

      // Validate station for Site Engr. role
      if (roleRequiresStation(formData.role) && !formData.station_id) {
        toast({
          title: "Missing Station",
          description: "Please select a station for Site Engineer.",
          variant: "destructive",
        });
        return;
      }

      // Validate commission for TA2 roles that require it
      if (shouldShowTA2Commission(formData.role) && !formData.commission) {
        toast({
          title: "Missing Commission",
          description: "Please select a commission for this TA2 role.",
          variant: "destructive",
        });
        return;
      }

      // Validate commission for Engr. Manager
      if (formData.role === 'Engr. Manager' && !formData.commission) {
        toast({
          title: "Missing Commission",
          description: "Please select a commission.",
          variant: "destructive",
        });
        return;
      }

      // Validate portfolio for roles that require it
      if (requiresPortfolioSelection(formData.role) && !formData.portfolio) {
        toast({
          title: "Missing Portfolio",
          description: "Please select a portfolio (region).",
          variant: "destructive",
        });
        return;
      }

      // Validate hub for roles that require both portfolio and hub
      if (requiresHub(formData.role) && !formData.hub) {
        toast({
          title: "Missing Project Hub",
          description: "Please select a project hub.",
          variant: "destructive",
        });
        return;
      }

      setStep('review');
    } else {
      // Confirm and create user
      setIsCreating(true);
      
      try {
        const generatedPassword = generatePassword();
        const positionTitle = generatePosition();
        const company = formData.company === 'Others' ? formData.customCompany : formData.company;
        const role = formData.role === 'Others' ? formData.customRole : formData.role;
        const phone = formData.phoneNumbers[0] ? 
          `${formData.phoneNumbers[0].countryCode}${formData.phoneNumbers[0].number}` : null;

        // Call the admin-create-user edge function
        const { data: createResp, error: createErr } = await supabase.functions.invoke("admin-create-user", {
          body: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            password: generatedPassword,
            company: company || null,
            role: role,
            position: positionTitle || null,
            phone: phone,
            personalEmail: formData.personalEmail || null,
            functionalEmail: formData.isFunctionalEmail ? formData.email : null,
            isFunctionalEmail: formData.isFunctionalEmail,
            commission: formData.commission || null,
            plant: getPlantName(formData.plant_id || '') || null,
            station: getStationName(formData.station_id || '') || null,
            field: getFieldName(formData.field_id || '') || null,
          }
        });

        if (createErr) {
          throw createErr;
        }

        // Log activity
        logActivityMutation.mutate({
          activityType: 'user_created',
          description: `Created new user account for ${formData.firstName} ${formData.lastName} (${formData.email})`,
          metadata: {
            user_id: createResp?.user_id,
            user_email: formData.email,
            user_name: `${formData.firstName} ${formData.lastName}`.trim(),
            company: company,
            role: role,
            position: positionTitle
          }
        });

        // Try to send welcome email (non-blocking)
        try {
          await supabase.functions.invoke("send-welcome-email", {
            body: {
              userEmail: formData.email,
              userName: `${formData.firstName} ${formData.lastName}`,
              temporaryPassword: generatedPassword,
              loginUrl: `${window.location.origin}/auth`
            }
          });
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
          toast({
            title: "Email Warning",
            description: `Welcome email could not be sent. Share credentials: ${formData.email} / ${generatedPassword}`,
            variant: "destructive"
          });
        }

        toast({
          title: "User Created Successfully",
          description: `${formData.firstName} ${formData.lastName} has been created.`,
        });

        // Notify parent to refresh list
        onCreateUser({});
        handleClose();
      } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
          title: "Error Creating User",
          description: error.message || "Failed to create user. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
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
      portfolio: '',
      hub: '',
      plant_id: '',
      field_id: '',
      station_id: '',
      authenticator: 'Daniel Memuletiwon',
    });
    setEmailError('');
    // Reset add role dialog state
    setShowAddRoleDialog(false);
    setNewRoleName('');
    setNewRoleFunctionId('');
    setShowAddFunctionInput(false);
    setNewFunctionName('');
    onClose();
  };

  const handleAddNewRole = async () => {
    if (!newRoleName.trim()) {
      toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' });
      return;
    }
    
    // Check for duplicate role name
    const normalizedNewRole = newRoleName.trim().toLowerCase();
    const existingRoles = categorizedRoles?.flatMap(group => group.roles) || [];
    const isDuplicate = existingRoles.some(role => role.name.toLowerCase() === normalizedNewRole);
    
    if (isDuplicate) {
      toast({ title: 'Error', description: `A role named "${newRoleName.trim()}" already exists`, variant: 'destructive' });
      return;
    }
    
    setIsAddingRole(true);
    try {
      let categoryId = newRoleFunctionId;
      
      // If adding a new function, create it first
      if (showAddFunctionInput && newFunctionName.trim()) {
        const maxOrder = roleCategories?.reduce((max, cat) => Math.max(max, cat.display_order), 0) || 0;
        const newCategory = await addCategory(newFunctionName.trim(), '', maxOrder + 1);
        categoryId = newCategory.id;
      }
      
      if (!categoryId) {
        toast({ title: 'Error', description: 'Please select a function', variant: 'destructive' });
        setIsAddingRole(false);
        return;
      }
      
      // Add the new role
      await addRole(newRoleName.trim(), '', categoryId);
      
      // Refresh the roles data
      await queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      await queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      
      // Get the function name and auto-select the new role
      const functionName = showAddFunctionInput 
        ? newFunctionName.trim() 
        : roleCategories?.find(c => c.id === categoryId)?.name || formData.function;
      
      setFormData(prev => ({ 
        ...prev, 
        function: functionName,
        role: newRoleName.trim(),
        plant: '',
        hub: ''
      }));
      
      toast({ title: 'Success', description: `Role "${newRoleName}" added successfully` });
      
      // Reset and close dialog
      setShowAddRoleDialog(false);
      setNewRoleName('');
      setNewRoleFunctionId('');
      setShowAddFunctionInput(false);
      setNewFunctionName('');
    } catch (error) {
      console.error('Error adding role:', error);
      toast({ title: 'Error', description: 'Failed to add role', variant: 'destructive' });
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleRoleChange = (value: string) => {
    if (value === '__add_new_role__') {
      // Pre-select the current function in the dialog
      const currentFunction = categorizedRoles?.find(g => g.category.name === formData.function);
      if (currentFunction) {
        setNewRoleFunctionId(currentFunction.category.id);
      }
      setShowAddRoleDialog(true);
    } else {
      // Reset all conditional fields when role changes
      setFormData(prev => ({ 
        ...prev, 
        role: value, 
        plant_id: '', 
        field_id: '', 
        station_id: '',
        hub: '',
        portfolio: '',
        commission: ''
      }));
    }
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
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {formData.isFunctionalEmail ? 'Functional Email Address *' : 'Email Address *'}
            </Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="personalEmail" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Email Address *</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company *</Label>
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

          {/* Function and Role - Same Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Function *</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={!formData.function}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.function ? "Select role" : "Select function first"} />
                </SelectTrigger>
                <SelectContent>
                  {formData.function === 'Other' ? (
                    <SelectItem value="Others (specify)">Others (specify)</SelectItem>
                  ) : (
                    <>
                      {getRolesForFunction().map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new_role__" className="text-primary font-medium">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add New Role
                        </span>
                      </SelectItem>
                    </>
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
          </div>

          {/* Portfolio Selection - for roles that require it */}
          {requiresPortfolioSelection(formData.role) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio *</Label>
              <Select
                value={formData.portfolio}
                onValueChange={(value) => setFormData(prev => ({ ...prev, portfolio: value, hub: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_REGIONS.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hub Selection - only for roles that require portfolio AND hub */}
          {requiresHub(formData.role) && formData.portfolio && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Hub *</Label>
              <Select
                value={formData.hub}
                onValueChange={(value) => setFormData(prev => ({ ...prev, hub: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project hub" />
                </SelectTrigger>
                <SelectContent>
                  {getHubsForPortfolio().map(hub => (
                    <SelectItem key={hub.id} value={hub.name}>{hub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {['Engr. Manager', 'HSE Manager'].includes(formData.role) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission *</Label>
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission *</Label>
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

          {/* Plant, Field, Station - Same Row */}
          {requiresPlant(formData.role) && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant *</Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plant_id: value, field_id: '', station_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={locationsLoading ? "Loading..." : "Select plant"} />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field selection for CS and KAZ plants when role requires field */}
              {requiresField(formData.role) && ['CS', 'KAZ'].includes(getPlantName(formData.plant_id || '')) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {getPlantName(formData.plant_id || '') === 'KAZ' ? 'Section *' : 'Field *'}
                  </Label>
                  <Select
                    value={formData.field_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, field_id: value, station_id: '' }))}
                    disabled={!formData.plant_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!formData.plant_id ? "Select plant first" : `Select ${getPlantName(formData.plant_id || '') === 'KAZ' ? 'section' : 'field'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getFieldsByPlant(formData.plant_id || '').map(field => (
                        <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {roleRequiresStationInHierarchy(formData.role) && getPlantName(formData.plant_id || '') === 'CS' && fieldHasStations(formData.field_id || '') && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station *</Label>
                  <Select
                    value={formData.station_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, station_id: value }))}
                    disabled={!formData.field_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!formData.field_id ? "Select field first" : "Select station"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getStationsByField(formData.field_id || '').map(station => (
                        <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Direct station selection for Site Engr. */}
          {roleRequiresStation(formData.role) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station *</Label>
              <Select
                value={formData.station_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, station_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={locationsLoading ? "Loading stations..." : "Select station"} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</span>
              <p className="text-sm mt-1">{formData.firstName} {formData.lastName}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
              <p className="text-sm mt-1">{formData.email}</p>
              {formData.isFunctionalEmail && (
                <p className="text-xs text-gray-500">
                  Personal: {formData.personalEmail}
                </p>
              )}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Numbers</span>
            <div className="mt-1">
              {formData.phoneNumbers.map((phone, index) => (
                <p key={index} className="text-sm">{phone.countryCode} {phone.number}</p>
              ))}
            </div>
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</span>
              <p className="text-sm mt-1">{formData.company === 'Others' ? formData.customCompany : formData.company}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</span>
              <p className="text-sm mt-1 font-medium">{generatePosition() || formData.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</span>
              <p className="text-sm mt-1">{formData.role === 'Others' ? formData.customRole : formData.role}</p>
            </div>
            <div>
              {formData.commission && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission</span>
                  <p className="text-sm mt-1">{formData.commission}</p>
                </>
              )}
              {formData.hub && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hub</span>
                  <p className="text-sm mt-1">{formData.hub}</p>
                </>
              )}
              {formData.plant_id && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant</span>
                  <p className="text-sm mt-1">{getPlantName(formData.plant_id)}</p>
                </>
              )}
              {formData.field_id && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field</span>
                  <p className="text-sm mt-1">{getFieldName(formData.field_id)}</p>
                </>
              )}
              {formData.station_id && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station</span>
                  <p className="text-sm mt-1">{getStationName(formData.station_id)}</p>
                </>
              )}
            </div>
          </div>
          {!isAdminCreated && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Authenticator</span>
              <p className="text-sm mt-1">{formData.authenticator}</p>
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
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : step === 'form' ? 'Review Request' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>

      {/* Add New Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Create a new role and assign it to a function.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-role-name">Role Name *</Label>
              <Input
                id="new-role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Senior Engineer"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Function *</Label>
              {!showAddFunctionInput ? (
                <div className="space-y-2">
                  <Select value={newRoleFunctionId} onValueChange={setNewRoleFunctionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a function" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleCategories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowAddFunctionInput(true)}
                    className="text-primary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New Function
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={newFunctionName}
                    onChange={(e) => setNewFunctionName(e.target.value)}
                    placeholder="e.g., Quality Assurance"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowAddFunctionInput(false);
                      setNewFunctionName('');
                    }}
                  >
                    Cancel - Select Existing Function
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddRoleDialog(false);
                setNewRoleName('');
                setNewRoleFunctionId('');
                setShowAddFunctionInput(false);
                setNewFunctionName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddNewRole} disabled={isAddingRole}>
              {isAddingRole ? 'Adding...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default EnhancedCreateUserModal;