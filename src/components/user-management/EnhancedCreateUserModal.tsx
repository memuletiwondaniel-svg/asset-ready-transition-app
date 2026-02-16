import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Plus, X, AlertCircle, CheckCircle, Loader2, Mail, Camera, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useHubs } from '@/hooks/useHubs';
import { useCategorizedRoles } from '@/hooks/useCategorizedRoles';
import { 
  requiresPortfolio as roleRequiresPortfolio, 
  requiresHub as roleRequiresHubAssignment,
  PORTFOLIO_REGIONS 
} from '@/utils/roleAssignmentConfig';
import {
  isOpsManager,
  OPS_MANAGER_PLANTS,
  opsManagerHasSubArea,
  getOpsManagerSubAreas,
  generateOpsManagerPosition,
  isOpsManagerTitleReady,
} from '@/utils/opsManagerConfig';
import { supabase } from '@/integrations/supabase/client';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { AvatarCropDialog } from '@/components/user-management/AvatarCropDialog';

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
  commission: string;
  portfolio: string;
  hub: string;
  plant: string;
  field: string;
  station: string;
  authenticator: string;
  ops_manager_plant: string;
  ops_manager_sub_area: string;
}

interface EnhancedCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (userData: any) => void;
  isAdminCreated: boolean;
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
    plant: '',
    field: '',
    station: '',
    authenticator: 'Daniel Memuletiwon',
    ops_manager_plant: '',
    ops_manager_sub_area: '',
  });

  const { data: hubs } = useHubs();
  const { data: categorizedRoles, isLoading: rolesLoading } = useCategorizedRoles();

  // Profile picture upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Database options state (name-based, matching Edit modal)
  const [plants, setPlants] = useState<Array<{value: string, label: string}>>([]);
  const [fields, setFields] = useState<Array<{value: string, label: string}>>([]);
  const [stations, setStations] = useState<Array<{value: string, label: string}>>([]);
  const [commissions, setCommissions] = useState<Array<{value: string, label: string}>>([]);

  // Fetch database options on mount
  useEffect(() => {
    const fetchDatabaseOptions = async () => {
      try {
        // Fetch plants
        const { data: plantsData } = await supabase
          .from('plant')
          .select('name')
          .eq('is_active', true)
          .order('name');
        setPlants(plantsData?.map(p => ({ value: p.name, label: p.name })) || []);

        // Fetch fields
        const { data: fieldsData } = await supabase
          .from('field')
          .select('name')
          .eq('is_active', true)
          .order('name');
        setFields(fieldsData?.map(f => ({ value: f.name, label: f.name })) || []);

        // Fetch stations
        const { data: stationsData } = await supabase
          .from('station')
          .select('name')
          .eq('is_active', true)
          .order('name');
        setStations(stationsData?.map(s => ({ value: s.name, label: s.name })) || []);

        // Fetch commissions
        const { data: commissionsData } = await supabase
          .from('commission')
          .select('name')
          .eq('is_active', true)
          .order('name');
        setCommissions(commissionsData?.map(c => ({ value: c.name, label: c.name })) || []);
      } catch (error) {
        console.error('Error fetching database options:', error);
      }
    };

    if (isOpen) {
      fetchDatabaseOptions();
    }
  }, [isOpen]);

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

  const authenticators = [
    'Daniel Memuletiwon (ORA Lead)',
    'Ahmed Al-Rashid (Plant Director)',
    'Sarah Mitchell (TA2)',
  ];

  // Role requirement helper functions (matching Edit modal)
  const requiresHub = (role: string) => roleRequiresHubAssignment(role);
  const requiresPortfolioSelection = (role: string) => roleRequiresPortfolio(role);
  const roleRequiresStation = (role: string) => role === 'Site Engr.' || role === 'Site Engineer';
  const requiresPlant = (role: string) => ['Plant Director', 'Dep. Plant Director'].includes(role);
  const requiresField = (role: string) => ['Ops Team Lead'].includes(role);
  const requiresPlantAndField = (role: string) => role === 'Section Head';
  const requiresAssetHierarchy = (role: string) => role === 'Ops Coach';
  
  const shouldShowTA2Commission = (role: string) => {
    const ta2RolesWithCommission = ['Elect TA2', 'Rotating TA2', 'PACO TA2', 'Static TA2', 'Process TA2'];
    return ta2RolesWithCommission.includes(role);
  };

  // Get filtered commissions for specific roles
  const getCommissionOptions = () => {
    if (formData.role === 'HSE Lead' || formData.role === 'Engr. Manager') {
      return commissions.filter(c => c.value === 'P&E' || c.value === 'Asset');
    }
    return commissions;
  };

  // Get hubs filtered by selected portfolio
  const getHubsForPortfolio = () => {
    if (!formData.portfolio) return [];
    return hubs?.filter(h => !PORTFOLIO_REGIONS.includes(h.name)) || [];
  };

  // Generate position based on role and contextual fields (matching Edit modal)
  const generatePosition = () => {
    const { role, commission, plant, station, field, hub, portfolio } = formData;
    
    if (!role) return '';
    
    // Roles that require portfolio + hub
    if (requiresHub(role) && portfolio && hub) {
      return `${role} – ${hub}`;
    }
    
    // Roles that require only portfolio
    if (requiresPortfolioSelection(role) && !requiresHub(role) && portfolio) {
      return `${role} – ${portfolio}`;
    }
    
    // Engineering TA2 roles with commission
    const ta2RolesWithCommission = ['Elect TA2', 'Rotating TA2', 'PACO TA2', 'Static TA2', 'Process TA2'];
    if (ta2RolesWithCommission.includes(role) && commission) {
      return `${role} - ${commission}`;
    }
    
    // Civil TA2, Tech Safety TA2, and HSE Manager - no drill-down needed
    if (['Civil TA2', 'Tech Safety TA2', 'HSE Manager'].includes(role)) {
      return role;
    }
    
    // Engr. Manager and HSE Lead with commission
    if (['Engr. Manager', 'HSE Lead'].includes(role) && commission) {
      return `${role} - ${commission}`;
    }
    
    // Director with commission
    if (role === 'Director' && commission) {
      return `${commission} Director`;
    }
    
    // Plant Director and Dep. Plant Director
    if (['Plant Director', 'Dep. Plant Director'].includes(role) && plant) {
      return `${role} - ${plant}`;
    }
    
    // Ops Manager
    if (isOpsManager(role)) {
      return generateOpsManagerPosition(formData.ops_manager_plant, formData.ops_manager_sub_area);
    }
    
    // Site Engineer requires station directly
    if (roleRequiresStation(role) && station) {
      return `Site Engr. - ${station}`;
    }
    
    // Ops Coach and Ops Team Lead with field
    if (['Ops Coach', 'Ops Team Lead'].includes(role) && field) {
      return `${role} - ${field}`;
    }
    
    // Section Head with field
    if (role === 'Section Head' && field) {
      return `Section Head - ${field}`;
    }
    
    // ER Lead
    if (role === 'ER Lead') {
      return 'ER Lead';
    }
    
    return role;
  };

  // Check if all required fields for the role are filled (matching Edit modal)
  const isTitleReady = () => {
    const { role, commission, portfolio, hub, plant, station, field } = formData;
    
    if (!role) return false;
    
    // Roles that require portfolio + hub
    if (requiresHub(role)) {
      return !!portfolio && !!hub;
    }
    
    // Roles that require only portfolio
    if (requiresPortfolioSelection(role) && !requiresHub(role)) {
      return !!portfolio;
    }
    
    // TA2 roles with commission requirement
    if (shouldShowTA2Commission(role)) {
      return !!commission;
    }
    
    // Civil TA2 and Tech Safety TA2 - no additional fields needed
    if (['Civil TA2', 'Tech Safety TA2'].includes(role)) {
      return true;
    }
    
    switch (role) {
      case 'Director':
      case 'Engr. Manager':
      case 'HSE Lead':
        return !!commission;
      case 'HSE Manager':
        return true;
      case 'Plant Director':
      case 'Dep. Plant Director':
        return !!plant;
      case 'Ops Manager':
        return isOpsManagerTitleReady(formData.ops_manager_plant, formData.ops_manager_sub_area);
      case 'Site Engr.':
      case 'Site Engineer':
        return !!station;
      case 'Ops Coach':
        return !!plant && !!field;
      case 'Ops Team Lead':
      case 'Section Head':
        return !!field;
      case 'ER Lead':
        return true;
      default:
        return true;
    }
  };

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

  const handleRoleChange = (value: string) => {
    // Reset all conditional fields when role changes
    setFormData(prev => ({ 
      ...prev, 
      role: value, 
      plant: '', 
      field: '', 
      station: '',
      hub: '',
      portfolio: '',
      commission: '',
      ops_manager_plant: '',
      ops_manager_sub_area: ''
    }));
  };

  const handlePlantChange = (value: string) => {
    // Reset field and station when plant changes
    setFormData(prev => ({ ...prev, plant: value, field: '', station: '' }));
  };

  const handleFieldChange = (value: string) => {
    // Reset station when field changes
    setFormData(prev => ({ ...prev, field: value, station: '' }));
  };

  // Image upload handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File Type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'File size must be less than 5MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setProfileImagePreview(e.target?.result as string);
    reader.readAsDataURL(croppedBlob);
    setShowCropDialog(false);
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
  };

  const clearImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    setImageToCrop(null);
  };

  const uploadProfileImage = async (userId: string): Promise<string | null> => {
    if (!profileImage) return null;
    try {
      setUploadingImage(true);
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const dataUrl = await toBase64(profileImage);
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const fileExt = profileImage.name.split('.').pop() || 'png';
      const { data, error } = await supabase.functions.invoke('upload-user-avatar', {
        body: { userId, fileExt, contentType: profileImage.type, base64 }
      });
      if (error) { console.error('Upload function error:', error); return null; }
      return (data as any)?.path || null;
    } catch (error) {
      console.error('Avatar upload error:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
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

      // Validate role-specific fields
      if (requiresPlant(formData.role) && !formData.plant) {
        toast({
          title: "Missing Plant",
          description: "Please select a plant.",
          variant: "destructive",
        });
        return;
      }

      if ((requiresAssetHierarchy(formData.role) || requiresPlantAndField(formData.role)) && !formData.plant) {
        toast({
          title: "Missing Plant",
          description: "Please select a plant.",
          variant: "destructive",
        });
        return;
      }

      if ((requiresAssetHierarchy(formData.role) || requiresPlantAndField(formData.role) || requiresField(formData.role)) && !formData.field) {
        toast({
          title: "Missing Field",
          description: "Please select a field.",
          variant: "destructive",
        });
        return;
      }

      if (roleRequiresStation(formData.role) && !formData.station) {
        toast({
          title: "Missing Station",
          description: "Please select a station.",
          variant: "destructive",
        });
        return;
      }

      if (shouldShowTA2Commission(formData.role) && !formData.commission) {
        toast({
          title: "Missing Commission",
          description: "Please select a commission.",
          variant: "destructive",
        });
        return;
      }

      if (['Engr. Manager', 'HSE Lead', 'Director'].includes(formData.role) && !formData.commission) {
        toast({
          title: "Missing Commission",
          description: "Please select a commission.",
          variant: "destructive",
        });
        return;
      }

      if (requiresPortfolioSelection(formData.role) && !formData.portfolio) {
        toast({
          title: "Missing Portfolio",
          description: "Please select a portfolio (region).",
          variant: "destructive",
        });
        return;
      }

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
            plant: formData.plant || null,
            station: formData.station || null,
            field: formData.field || null,
          }
        });

        if (createErr) {
          throw createErr;
        }

        // Upload profile image if provided
        if (profileImage && createResp?.user_id) {
          await uploadProfileImage(createResp.user_id);
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
      plant: '',
      field: '',
      station: '',
      authenticator: 'Daniel Memuletiwon',
      ops_manager_plant: '',
      ops_manager_sub_area: '',
    });
    setEmailError('');
    clearImage();
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

          {/* Profile Picture Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profile Picture</Label>
            <div className="flex flex-col gap-4">
              {profileImagePreview && (
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileImagePreview} alt="Profile preview" />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm" onClick={clearImage} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              )}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="enhanced-profile-image-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                      onClick={() => document.getElementById('enhanced-profile-image-upload')?.click()}
                      disabled={uploadingImage}
                    >
                      Click to upload
                    </Button>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                </div>
              </div>
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

          {/* Function and Role selection - Grid Layout matching Edit modal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            {/* Function (Category) Field */}
            <div>
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
                </SelectContent>
              </Select>
            </div>

            {/* Role Field */}
            <div>
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
                  {getRolesForFunction().map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields based on role - matching Edit modal */}
            
            {/* Director - Commission */}
            {formData.role === 'Director' && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission *</Label>
                <Combobox
                  value={formData.commission}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commission: value }))}
                  options={commissions}
                  placeholder="Select commission"
                  searchPlaceholder="Search commissions..."
                  emptyText="No commissions found"
                />
              </div>
            )}

            {/* Plant Director / Dep. Plant Director - Plant only */}
            {(formData.role === 'Plant Director' || formData.role === 'Dep. Plant Director') && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant *</Label>
                <Combobox
                  value={formData.plant}
                  onValueChange={handlePlantChange}
                  options={plants}
                  placeholder="Select plant"
                  searchPlaceholder="Search plants..."
                  emptyText="No plants found"
                />
              </div>
            )}

            {/* Ops Manager - Plant + optional Sub-Area */}
            {isOpsManager(formData.role) && (
              <>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant *</Label>
                  <Select
                    value={formData.ops_manager_plant}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ops_manager_plant: value, ops_manager_sub_area: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {OPS_MANAGER_PLANTS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.ops_manager_plant && opsManagerHasSubArea(formData.ops_manager_plant) && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Area *</Label>
                    <Select
                      value={formData.ops_manager_sub_area}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, ops_manager_sub_area: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        {getOpsManagerSubAreas(formData.ops_manager_plant).map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* Site Engr. - Station directly */}
            {roleRequiresStation(formData.role) && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station *</Label>
                <Combobox
                  value={formData.station}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, station: value }))}
                  options={stations}
                  placeholder="Select station"
                  searchPlaceholder="Search stations..."
                  emptyText="No stations found"
                />
              </div>
            )}

            {/* Ops Team Lead - Field */}
            {requiresField(formData.role) && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field *</Label>
                <Combobox
                  value={formData.field}
                  onValueChange={handleFieldChange}
                  options={fields}
                  placeholder="Select field"
                  searchPlaceholder="Search fields..."
                  emptyText="No fields found"
                />
              </div>
            )}

            {/* Section Head - Plant + Field */}
            {requiresPlantAndField(formData.role) && (
              <>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant *</Label>
                  <Select
                    value={formData.plant}
                    onValueChange={handlePlantChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map(plant => (
                        <SelectItem key={plant.value} value={plant.value}>
                          {plant.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {['CS', 'KAZ'].includes(formData.plant) && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {formData.plant === 'KAZ' ? 'Section *' : 'Field *'}
                    </Label>
                    <Select
                      value={formData.field}
                      onValueChange={handleFieldChange}
                      disabled={!formData.plant}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.plant ? `Select ${formData.plant === 'KAZ' ? 'section' : 'field'}` : "Select plant first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* Ops Coach - Full Asset Hierarchy (Plant > Field > Station) */}
            {requiresAssetHierarchy(formData.role) && (
              <>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant *</Label>
                  <Select
                    value={formData.plant}
                    onValueChange={handlePlantChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map(plant => (
                        <SelectItem key={plant.value} value={plant.value}>
                          {plant.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field *</Label>
                  <Select
                    value={formData.field}
                    onValueChange={handleFieldChange}
                    disabled={!formData.plant}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.plant ? "Select field" : "Select plant first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Station - hidden for Ops Coach with CS plant */}
                {!(formData.role === 'Ops Coach' && formData.plant === 'CS') && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station</Label>
                    <Combobox
                      value={formData.station}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, station: value }))}
                      options={stations}
                      placeholder={formData.field ? "Select station" : "Select field first"}
                      searchPlaceholder="Search stations..."
                      emptyText="No stations found"
                      className={!formData.field ? 'opacity-50' : ''}
                    />
                  </div>
                )}
              </>
            )}

            {/* TA2 Roles with Commission (Elect, Rotating, PACO, Static, Process) */}
            {shouldShowTA2Commission(formData.role) && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission *</Label>
                <Combobox
                  value={formData.commission}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commission: value }))}
                  options={[
                    { value: 'Project', label: 'Project' },
                    { value: 'Asset', label: 'Asset' }
                  ]}
                  placeholder="Select commission"
                  searchPlaceholder="Search commissions..."
                  emptyText="No commissions found"
                />
              </div>
            )}

            {/* Engr. Manager - Commission */}
            {formData.role === 'Engr. Manager' && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission *</Label>
                <Combobox
                  value={formData.commission}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commission: value }))}
                  options={getCommissionOptions()}
                  placeholder="Select commission (P&E or Asset only)"
                  searchPlaceholder="Search commissions..."
                  emptyText="No commissions found"
                />
              </div>
            )}

            {/* HSE Lead - Commission */}
            {formData.role === 'HSE Lead' && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission *</Label>
                <Combobox
                  value={formData.commission}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commission: value }))}
                  options={getCommissionOptions()}
                  placeholder="Select commission (P&E or Asset only)"
                  searchPlaceholder="Search commissions..."
                  emptyText="No commissions found"
                />
              </div>
            )}

            {/* Portfolio Selection */}
            {requiresPortfolioSelection(formData.role) && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio *</Label>
                <Combobox
                  value={formData.portfolio}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, portfolio: value, hub: '' }))}
                  options={PORTFOLIO_REGIONS.map(r => ({ value: r, label: r }))}
                  placeholder="Select portfolio"
                  emptyText="No portfolios found"
                  showSearch={false}
                />
              </div>
            )}

            {/* Hub Selection - only for roles that require portfolio AND hub */}
            {requiresHub(formData.role) && formData.portfolio && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Hub *</Label>
                <Combobox
                  value={formData.hub}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hub: value }))}
                  options={getHubsForPortfolio().map(hub => ({ value: hub.name, label: hub.name }))}
                  placeholder="Select Project Hub"
                  searchPlaceholder="Search hubs..."
                  emptyText="No hubs found"
                />
              </div>
            )}
          </div>

          {/* Position Display - Shows generated position when all required fields are filled */}
          {isTitleReady() && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</Label>
              <div className="p-3 bg-muted rounded-md border mt-1">
                <span className="font-medium text-primary">{generatePosition()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This position is automatically generated based on your role and selections above.
              </p>
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
          <div className="flex items-start gap-4">
            {/* Profile Picture */}
            <Avatar className="h-16 w-16 shrink-0 border-2 border-muted">
              {profileImagePreview ? (
                <AvatarImage src={profileImagePreview} alt="Profile" />
              ) : null}
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {formData.firstName?.[0]?.toUpperCase()}{formData.lastName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid grid-cols-2 gap-4 flex-1">
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
          <CardTitle className="text-base">Company & Role</CardTitle>
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
              {formData.plant && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plant</span>
                  <p className="text-sm mt-1">{formData.plant}</p>
                </>
              )}
              {formData.field && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field</span>
                  <p className="text-sm mt-1">{formData.field}</p>
                </>
              )}
              {formData.station && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station</span>
                  <p className="text-sm mt-1">{formData.station}</p>
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

      {/* Avatar Crop Dialog */}
      {showCropDialog && imageToCrop && (
        <AvatarCropDialog
          open={showCropDialog}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </Dialog>
  );
};

export default EnhancedCreateUserModal;
