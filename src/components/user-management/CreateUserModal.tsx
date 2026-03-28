import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Plus, X, Upload, Camera, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { useCommissions } from "@/hooks/useCommissions";
import { usePlants } from "@/hooks/usePlants";
import { useStations } from "@/hooks/useStations";
import { useFields } from "@/hooks/useFields";
import { useDisciplines } from "@/hooks/useDisciplines";
import { useHubs } from "@/hooks/useHubs";
import { useLogActivity } from "@/hooks/useActivityLogs";
import { AvatarCropDialog } from "@/components/user-management/AvatarCropDialog";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser?: (userData: any) => void;
  onUserCreated?: () => void;
}

const CreateUserModal = ({ isOpen, onClose, onCreateUser, onUserCreated }: CreateUserModalProps) => {
  const { toast } = useToast();
  const { mutate: logActivity } = useLogActivity();
  const { roles, isLoading: rolesLoading, addRole } = useRoles();
  const { commissions, isLoading: commissionsLoading, addCommission } = useCommissions();
  const { plants, isLoading: plantsLoading, addPlant } = usePlants();
  const { stations, isLoading: stationsLoading, addStation } = useStations();
  const { fields, isLoading: fieldsLoading, addField } = useFields();
  const { disciplines, isLoading: disciplinesLoading } = useDisciplines();
  const { data: hubs } = useHubs();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    isFunctionalEmail: false,
    personalEmail: "",
    functionalEmail: "",
    phone: "",
    countryCode: "+964", // Default to Iraq
    company: "",
    otherCompany: "",
    role: "",
    newRole: "",
    discipline: "",
    commission: "",
    plant: "",
    station: "",
    field: "",
    hub: "",
    systemRole: "user", // Default system role
  });

  const [roleSearch, setRoleSearch] = useState("");
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Profile picture upload state
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  // Get role names from the database
  const roleNames = roles.map(role => role.name);
  
  // Get commission names from the database
  const commissionNames = commissions.map(commission => commission.name);
  
  // Get plant names from the database  
  const plantNames = plants.map(plant => plant.name);
  
  // Get station names from the database
  const stationNames = stations.map(station => station.name);
  
  // Get field names from the database
  const fieldNames = fields.map(field => field.name);
  
  // Get discipline names from the database
  const disciplineNames = disciplines?.map(discipline => discipline.name) || [];

  const companies = [
    { value: "BGC", label: "Asset Owner (BGC)", logo: "/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" },
    { value: "KENT", label: "Kent Engineering", logo: "/lovable-uploads/ce220599-66e9-4a0a-8a13-da52ebf6ca14.png" },
    { value: "Others", label: "Others (specify)" },
  ];

  const countryCodes = [
    { code: "+61", country: "Australia", flag: "🇦🇺", shortName: "AU" },
    { code: "+973", country: "Bahrain", flag: "🇧🇭", shortName: "BH" },
    { code: "+55", country: "Brazil", flag: "🇧🇷", shortName: "BR" },
    { code: "+1", country: "Canada", flag: "🇨🇦", shortName: "CA" },
    { code: "+86", country: "China", flag: "🇨🇳", shortName: "CN" },
    { code: "+20", country: "Egypt", flag: "🇪🇬", shortName: "EG" },
    { code: "+33", country: "France", flag: "🇫🇷", shortName: "FR" },
    { code: "+49", country: "Germany", flag: "🇩🇪", shortName: "DE" },
    { code: "+91", country: "India", flag: "🇮🇳", shortName: "IN" },
    { code: "+98", country: "Iran", flag: "🇮🇷", shortName: "IR" },
    { code: "+964", country: "Iraq", flag: "🇮🇶", shortName: "IQ" },
    { code: "+39", country: "Italy", flag: "🇮🇹", shortName: "IT" },
    { code: "+81", country: "Japan", flag: "🇯🇵", shortName: "JP" },
    { code: "+962", country: "Jordan", flag: "🇯🇴", shortName: "JO" },
    { code: "+965", country: "Kuwait", flag: "🇰🇼", shortName: "KW" },
    { code: "+961", country: "Lebanon", flag: "🇱🇧", shortName: "LB" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾", shortName: "MY" },
    { code: "+52", country: "Mexico", flag: "🇲🇽", shortName: "MX" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱", shortName: "NL" },
    { code: "+968", country: "Oman", flag: "🇴🇲", shortName: "OM" },
    { code: "+92", country: "Pakistan", flag: "🇵🇰", shortName: "PK" },
    { code: "+974", country: "Qatar", flag: "🇶🇦", shortName: "QA" },
    { code: "+7", country: "Russia", flag: "🇷🇺", shortName: "RU" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦", shortName: "SA" },
    { code: "+65", country: "Singapore", flag: "🇸🇬", shortName: "SG" },
    { code: "+27", country: "South Africa", flag: "🇿🇦", shortName: "ZA" },
    { code: "+82", country: "South Korea", flag: "🇰🇷", shortName: "KR" },
    { code: "+34", country: "Spain", flag: "🇪🇸", shortName: "ES" },
    { code: "+46", country: "Sweden", flag: "🇸🇪", shortName: "SE" },
    { code: "+41", country: "Switzerland", flag: "🇨🇭", shortName: "CH" },
    { code: "+90", country: "Turkey", flag: "🇹🇷", shortName: "TR" },
    { code: "+971", country: "United Arab Emirates", flag: "🇦🇪", shortName: "AE" },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧", shortName: "GB" },
    { code: "+1", country: "United States", flag: "🇺🇸", shortName: "US" },
  ];



  const systemRoles = [
    { value: "user", label: "User" },
    { value: "admin", label: "Administrator" },
    { value: "manager", label: "Manager" },
    { value: "engineer", label: "Engineer" },
    { value: "safety_officer", label: "Safety Officer" },
    { value: "technical_authority", label: "Technical Authority" },
  ];

  // Filter roles based on search term, show all if no search term
  const filteredRoles = roleSearch 
    ? roleNames.filter(role => role.toLowerCase().includes(roleSearch.toLowerCase()))
    : roleNames;

  // Function to add a new role
  const addNewRole = async () => {
    if (formData.newRole.trim() && !roleNames.includes(formData.newRole.trim())) {
      try {
        await addRole(formData.newRole.trim());
        handleInputChange("role", formData.newRole.trim());
        handleInputChange("newRole", "");
        setShowNewRoleInput(false);
        setShowRoleDropdown(false);
        setRoleSearch("");
      } catch (error) {
        // Error toast is handled in the hook
        console.error("Failed to add role:", error);
      }
    }
  };

  // Helper function to check if all conditional fields are filled for the current role
  const areAllConditionalFieldsFilled = () => {
    const role = formData.role;
    
    // Director, HSE Lead, Engr. Manager need commission
    if ((role === "Director" || role === "HSE Lead" || role === "Engr. Manager") && !formData.commission) {
      return false;
    }
    
    // Plant Director, Dep. Plant Director need plant
    if ((role === "Plant Director" || role === "Dep. Plant Director") && !formData.plant) {
      return false;
    }
    
    // Site Engineer/Site Engr needs station
    if ((role === "Site Engineer" || role === "Site Engr") && !formData.station) {
      return false;
    }
    
    // Ops Coach, Ops Team Lead need field
    if ((role === "Ops Coach" || role === "Ops Team Lead") && !formData.field) {
      return false;
    }
    
    // TA2 needs discipline (for non-discipline-specific TA2 roles)
    if (role.includes("TA2")) {
      // For disciplines other than Tech Safety and Civil, commission is required
      if (!role.includes("Civil") && !role.includes("Tech Safety") && !formData.commission) {
        return false;
      }
    }
    
    return true;
  };

  // Helper function to generate position title based on role and conditional fields
  const generatePositionTitle = () => {
    const role = formData.role;
    
    if (!role) return '';
    
    switch (role) {
      case 'Director':
        return formData.commission ? `${formData.commission} Director` : '';
      
      case 'Plant Director':
        return formData.plant ? `${formData.plant} Plant Director` : '';
      
      case 'Dep. Plant Director':
        return formData.plant ? `${formData.plant} Dep. Plant Director` : '';
      
      case 'Site Engineer':
        return formData.station ? `Site Engr – ${formData.station}` : '';
      
      case 'Ops Coach':
        return formData.field ? `Ops Coach – ${formData.field}` : '';
      
      case 'Ops Team Lead':
        return formData.field ? `Ops Team Lead – ${formData.field}` : '';
      
      case 'Engr. Manager':
        return formData.commission ? `Engr. Manager – ${formData.commission}` : '';
      
      case 'HSE Lead':
        return formData.commission ? `HSE Lead – ${formData.commission}` : '';
      
      case 'ORA Engineer':
        return formData.hub ? `ORA Engineer – ${formData.hub}` : '';
      
      case 'ER Lead':
        return 'ER Lead';
      
      // TA2 roles now have discipline in the name (e.g., "Process TA2 - Project")
      // Position title adds commission for non-Civil/Tech Safety disciplines
      default:
        // Handle TA2 roles (e.g., "Process TA2 - Project", "Civil TA2")
        if (role.includes("TA2")) {
          if (role.includes("Civil") || role.includes("Tech Safety")) {
            return role; // e.g., "Civil TA2"
          }
          if (formData.commission) {
            return `${role} - ${formData.commission}`; // e.g., "Process TA2 - Project - P&E"
          }
          return role;
        }
        return '';
    }
  };

  // Helper function to get the final combined role
  const getFinalRole = () => {
    const role = formData.role;
    
    if ((role === "Director" || role === "HSE Lead") && formData.commission) {
      return `${formData.commission} ${role}`;
    }
    
    if (role === "Engr. Manager" && formData.commission) {
      return `Engr. Manager - ${formData.commission}`;
    }
    
    if ((role === "Plant Director" || role === "Dep. Plant Director") && formData.plant) {
      if (role === "Plant Director") {
        return `${formData.plant} Plant Director`;
      } else {
        return `${formData.plant} Dep Plant Dir`;
      }
    }
    
    if ((role === "Site Engineer" || role === "Site Engr") && formData.station) {
      return `Site Engr - ${formData.station}`;
    }
    
    if ((role === "Ops Coach" || role === "Ops Team Lead") && formData.field) {
      return `${role} - ${formData.field}`;
    }
    
    if (role === "TA2" && formData.discipline) {
      // For Tech Safety and Civil, don't include commission
      if (formData.discipline === "Tech Safety" || formData.discipline === "Civil") {
        return `TA2 ${formData.discipline}`;
      }
      // For other disciplines, include commission if provided
      if (formData.commission) {
        return `TA2 ${formData.discipline} (${formData.commission})`;
      }
      return `TA2 ${formData.discipline}`;
    }
    
    return role; // Return base role if no conditional fields or not all filled
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Store conditional field values but don't auto-combine roles
      // Only show combined role when all conditional fields are filled
      
      // Don't automatically combine roles - keep base role
      // Conditional fields will be stored but role remains unchanged
      // The final role display will handle showing the combined role
      
      // Reset fields when switching away from specific roles
      if (field === "role") {
        if ((prev.role.includes("Director") || prev.role.includes("HSE Lead") || prev.role.includes("Engr. Manager")) && 
            value !== "Director" && value !== "HSE Lead" && value !== "Engr. Manager") {
          newData.commission = "";
        }
        if ((prev.role.includes("Plant Director") || prev.role.includes("Dep Plant Dir")) && 
            value !== "Plant Director" && value !== "Dep. Plant Director") {
          newData.plant = "";
        }
        if (prev.role.includes("Site Engr") && value !== "Site Engr") {
          newData.station = "";
        }
        if ((prev.role.includes("Ops Coach") || prev.role.includes("Ops Team Lead")) && 
            value !== "Ops Coach" && value !== "Ops Team Lead") {
          newData.field = "";
        }
        if (prev.role.includes("TA2") && !value.includes("TA2")) {
          newData.commission = "";
          newData.discipline = "";
        }
      }
      
      return newData;
    });
  };


  // Image upload handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleImageFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview and open crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageToCrop(result);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const file = new File([croppedBlob], "avatar.png", { type: "image/png" });
    setProfileImage(file);
    
    // Create preview from blob
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(croppedBlob);
    
    setShowCropDialog(false);
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFile(files[0]);
    }
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

      // Prepare base64 payload
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const dataUrl = await toBase64(profileImage);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const fileExt = profileImage.name.split(".").pop() || "png";

      const { data, error } = await supabase.functions.invoke("upload-user-avatar", {
        body: {
          userId,
          fileExt,
          contentType: profileImage.type,
          base64,
        }
      });

      if (error) {
        console.error("Upload function error:", error);
        return null;
      }

      return (data as any)?.path || null;
    } catch (error) {
      console.error("Avatar upload error:", error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Additional validation for functional email setup
    if (formData.isFunctionalEmail && !formData.functionalEmail) {
      toast({
        title: "Validation Error",
        description: "Functional email is required when 'Add a functional email' is checked",
        variant: "destructive"
      });
      return;
    }

    // Generate password and show confirmation
    const password = `${formData.firstName.toLowerCase()}0000`;
    setGeneratedPassword(password);
    setShowConfirmation(true);
  };

  const handleConfirmCreate = async () => {
    setIsCreating(true);
    
    try {
      // Generate position title based on role and conditional fields
      const positionTitle = generatePositionTitle();
      
      // First, create the user to get the user ID
      const { data: createResp, error: createErr } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: generatedPassword,
          company: formData.company === "Others" ? null : formData.company,
          role: formData.role,
          position: positionTitle || null,
          phone: formData.countryCode + formData.phone,
          personalEmail: formData.personalEmail || null,
          functionalEmail: formData.functionalEmail || null,
          isFunctionalEmail: formData.isFunctionalEmail,
          discipline: formData.discipline || null,
          commission: formData.commission || null,
          plant: formData.plant || null,
          station: formData.station || null,
          field: formData.field || null,
          systemRole: formData.systemRole,
        }
      });

      if (createErr) {
        throw createErr;
      }

      // If user created successfully and there's a profile image, upload it
      if (profileImage && createResp?.user_id) {
        await uploadProfileImage(createResp.user_id);
      }

      // Log activity
      logActivity({
        activityType: 'user_created',
        description: `Created new user account for ${formData.firstName} ${formData.lastName} (${formData.email})`,
        metadata: {
          user_id: createResp?.user_id,
          user_email: formData.email,
          user_name: `${formData.firstName} ${formData.lastName}`.trim(),
          company: formData.company,
          role: formData.role,
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
      onUserCreated?.();

      // Reset form and close modal
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        isFunctionalEmail: false,
        personalEmail: "",
        functionalEmail: "",
        phone: "",
        countryCode: "+964",
        company: "",
        otherCompany: "",
        role: "",
        newRole: "",
        discipline: "",
        commission: "",
        plant: "",
        station: "",
        field: "",
        hub: "",
        systemRole: "user",
        
      });
      
      // Reset profile image
      clearImage();
      setRoleSearch("");
      setShowNewRoleInput(false);
      setShowRoleDropdown(false);
      setShowConfirmation(false);
      setGeneratedPassword("");
      onClose();
      
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Profile Picture Upload */}
              <div className="space-y-3">
                <Label>Profile Picture</Label>
                <div className="flex flex-col gap-4">
                  {/* Avatar Preview */}
                  {profileImagePreview && (
                    <div className="flex items-center gap-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profileImagePreview} alt="Profile preview" />
                        <AvatarFallback>
                          <User className="h-12 w-12" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearImage}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  )}

                  {/* Upload Area */}
                  <div className="space-y-2">
                    {/* Drag & Drop Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOver ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="profile-image-upload"
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
                            onClick={() => document.getElementById("profile-image-upload")?.click()}
                            disabled={uploadingImage}
                          >
                            Click to upload
                          </Button>
                          <span className="text-muted-foreground"> or drag and drop</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="functionalEmail"
                  checked={formData.isFunctionalEmail}
                  onCheckedChange={(checked) => handleInputChange("isFunctionalEmail", checked)}
                />
                <Label htmlFor="functionalEmail">Add a functional email</Label>
              </div>

              {formData.isFunctionalEmail && (
                <div>
                  <Label htmlFor="functionalEmail">Functional Email *</Label>
                  <Input
                    id="functionalEmail"
                    type="email"
                    value={formData.functionalEmail}
                    onChange={(e) => handleInputChange("functionalEmail", e.target.value)}
                    required
                    placeholder="functional.email@bgc.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Shared functional email address for operational purposes
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.countryCode}
                    onValueChange={(value) => handleInputChange("countryCode", value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex items-center justify-center w-[24px] h-[16px] text-center border border-border/20 rounded-sm bg-muted/30"
                            style={{ 
                              fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji", "EmojiOne", sans-serif',
                              fontSize: "14px",
                              lineHeight: "16px"
                            }}
                          >
                            <span className="block leading-none">
                              {countryCodes.find(c => c.code === formData.countryCode)?.flag || "🌍"}
                            </span>
                          </div>
                          <span className="text-sm font-mono font-semibold">{formData.countryCode}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country) => (
                        <SelectItem key={`${country.code}-${country.shortName}`} value={country.code} className="cursor-pointer py-2 hover:bg-accent">
                          <div className="flex items-center gap-3 w-full">
                            <div 
                              className="flex items-center justify-center min-w-[28px] h-[20px] text-center border border-border/20 rounded-sm bg-muted/30"
                              style={{ 
                                fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji", "EmojiOne", sans-serif',
                                fontSize: "16px",
                                lineHeight: "20px"
                              }}
                              title={`${country.country} flag`}
                            >
                              <span className="block leading-none">{country.flag}</span>
                            </div>
                            <span className="text-sm font-mono font-semibold min-w-[60px] text-foreground">
                              {country.code}
                            </span>
                            <span className="text-sm text-muted-foreground truncate flex-1">
                              {country.country}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company & Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company & Role Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company *</Label>
                <Select onValueChange={(value) => handleInputChange("company", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.value} value={company.value}>
                        <div className="flex items-center gap-2">
                          {company.logo && (
                            <img 
                              src={company.logo} 
                              alt={`${company.label} logo`} 
                              className="w-5 h-5 object-contain"
                            />
                          )}
                          <span>{company.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.company === "Others" && (
                <div>
                  <Label htmlFor="otherCompany">Specify Company</Label>
                  <Input
                    id="otherCompany"
                    value={formData.otherCompany}
                    onChange={(e) => handleInputChange("otherCompany", e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              )}

              <div>
                <div className="space-y-4">
                  {/* Role Selection Row - All fields aligned horizontally */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                    {/* Primary Role Field */}
                    <div className="flex flex-col">
                      <Label htmlFor="role" className="mb-2">Role *</Label>
                      <div className="space-y-2">
                        <Select 
                          value={formData.role}
                          onValueChange={(value) => {
                            if (value === "__add_custom__") {
                              setShowNewRoleInput(true);
                              return;
                            }
                            
                            // Reset conditional fields based on role selection
                            const selectedRole = value;
                            
                            // Reset commission if switching away from roles that need it
                            if (selectedRole !== "Director" && selectedRole !== "HSE Lead" && selectedRole !== "Engr. Manager" && !selectedRole.includes("TA2")) {
                              handleInputChange("commission", "");
                            }
                            // Reset plant if switching away from plant roles
                            if (selectedRole !== "Plant Director" && selectedRole !== "Dep. Plant Director") {
                              handleInputChange("plant", "");
                            }
                            // Reset station if switching away from site roles
                            if (selectedRole !== "Site Engineer" && selectedRole !== "Site Engr") {
                              handleInputChange("station", "");
                            }
                            // Reset field if switching away from ops roles
                            if (selectedRole !== "Ops Coach" && selectedRole !== "Ops Team Lead") {
                              handleInputChange("field", "");
                            }
                             // Reset TA2 fields when selecting non-TA2 roles
                            if (!selectedRole.includes("TA2")) {
                              handleInputChange("discipline", "");
                              if (selectedRole !== "Director" && selectedRole !== "HSE Lead" && selectedRole !== "Engr. Manager") {
                                handleInputChange("commission", "");
                              }
                            }
                            // Reset commission when switching between TA2 roles
                            if (selectedRole.includes("TA2")) {
                              handleInputChange("commission", "");
                            }
                            
                            handleInputChange("role", selectedRole);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {rolesLoading ? (
                              <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                            ) : roleNames.length > 0 ? (
                              roleNames.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-roles" disabled>No roles available</SelectItem>
                            )}
                            
                            {/* Option to add custom role */}
                            <div className="border-t mt-2 pt-2">
                              <SelectItem value="__add_custom__" className="font-medium text-primary">
                                + Add Custom Role
                              </SelectItem>
                            </div>
                          </SelectContent>
                        </Select>
                        
                        {showNewRoleInput && (
                          <div className="border rounded-lg bg-popover p-3 space-y-2">
                            <Label htmlFor="newRole">New Role Name</Label>
                            <div className="flex gap-2">
                              <Input
                                id="newRole"
                                value={formData.newRole}
                                onChange={(e) => handleInputChange("newRole", e.target.value)}
                                placeholder="Enter new role name"
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={addNewRole}
                                disabled={!formData.newRole.trim()}
                              >
                                Add
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowNewRoleInput(false);
                                  handleInputChange("newRole", "");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        
                      </div>
                    </div>

                    {/* Conditional Fields */}
                    {/* Discipline Field removed for TA2 - discipline is now part of the role name */}

                    {/* Commission Field for Director, HSE Lead, Engr. Manager, and TA2 roles */}
                    {((formData.role === "Director" || formData.role === "HSE Lead" || formData.role === "Engr. Manager") || 
                      (formData.role.includes("Director") && !formData.role.includes("Plant Director") && !formData.role.includes("Dep Plant Dir")) ||
                      (formData.role.includes("HSE Lead")) || (formData.role.includes("Engr. Manager")) ||
                       // For TA2, show commission only if role is not Civil or Tech Safety
                       (formData.role.includes("TA2") && !formData.role.includes("Civil") && !formData.role.includes("Tech Safety"))) && (
                      <div className="flex flex-col">
                        <Label htmlFor="commission" className="mb-2">Commission *</Label>
                        <Select 
                          value={formData.commission}
                          onValueChange={(value) => handleInputChange("commission", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select commission" />
                          </SelectTrigger>
                          <SelectContent>
                            {commissionsLoading ? (
                              <SelectItem value="loading" disabled>Loading commissions...</SelectItem>
                            ) : commissionNames.length > 0 ? (
                              commissionNames
                                .filter((commissionName) => {
                                  // Filter commission options based on role
                                  if (formData.role === "Engr. Manager" || formData.role.includes("Engr. Manager")) {
                                    return commissionName === "P&E" || commissionName === "Asset";
                                  }
                                  // For TA2, show only P&E and Asset
                                  if (formData.role === "TA2" || formData.role.includes("TA2")) {
                                    return commissionName === "P&E" || commissionName === "Asset";
                                  }
                                  return true; // Show all options for other roles
                                })
                                .map((commissionName) => (
                                <SelectItem key={commissionName} value={commissionName}>
                                  {commissionName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-commissions" disabled>No commissions available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Plant Field for Plant Director roles */}
                    {(formData.role === "Plant Director" || formData.role === "Dep. Plant Director" || 
                      formData.role.includes("Plant Director") || formData.role.includes("Dep Plant Dir")) && (
                      <div className="flex flex-col">
                        <Label htmlFor="plant" className="mb-2">Plant *</Label>
                        <Select 
                          value={formData.plant}
                          onValueChange={(value) => handleInputChange("plant", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select plant" />
                          </SelectTrigger>
                          <SelectContent>
                            {plantsLoading ? (
                              <SelectItem value="loading" disabled>Loading plants...</SelectItem>
                            ) : plantNames.length > 0 ? (
                              plantNames.map((plantName) => (
                                <SelectItem key={plantName} value={plantName}>
                                  {plantName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-plants" disabled>No plants available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Station Field for Site Engineer roles */}
                    {(formData.role === "Site Engineer" || formData.role === "Site Engr" || 
                      formData.role.includes("Site Engineer") || formData.role.includes("Site Engr")) && (
                      <div className="flex flex-col">
                        <Label htmlFor="station" className="mb-2">Station *</Label>
                        <Select 
                          value={formData.station}
                          onValueChange={(value) => handleInputChange("station", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            {stationsLoading ? (
                              <SelectItem value="loading" disabled>Loading stations...</SelectItem>
                            ) : stationNames.length > 0 ? (
                              stationNames.map((stationName) => (
                                <SelectItem key={stationName} value={stationName}>
                                  {stationName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-stations" disabled>No stations available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Field Field for Ops Coach and Ops Team Lead roles */}
                    {(formData.role === "Ops Coach" || formData.role === "Ops Team Lead" || 
                      formData.role.includes("Ops Coach") || formData.role.includes("Ops Team Lead")) && (
                      <div className="flex flex-col">
                        <Label htmlFor="field" className="mb-2">Field *</Label>
                        <Select 
                          value={formData.field}
                          onValueChange={(value) => handleInputChange("field", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldsLoading ? (
                              <SelectItem value="loading" disabled>Loading fields...</SelectItem>
                            ) : fieldNames.length > 0 ? (
                              fieldNames.map((fieldName) => (
                                <SelectItem key={fieldName} value={fieldName}>
                                  {fieldName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-fields" disabled>No fields available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Hub Field for ORA Engineer roles */}
                    {(formData.role === "ORA Engineer" || formData.role.includes("ORA Engineer")) && (
                      <div className="flex flex-col">
                        <Label htmlFor="hub" className="mb-2">Hub *</Label>
                        <Select 
                          value={formData.hub}
                          onValueChange={(value) => handleInputChange("hub", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Hub" />
                          </SelectTrigger>
                          <SelectContent>
                            {hubs ? (
                              hubs
                                .filter((hub) => ['North', 'Central', 'South', 'Lead'].includes(hub.name))
                                .map((hub) => (
                                <SelectItem key={hub.id} value={hub.name}>
                                  {hub.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-hubs" disabled>No hubs available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Position Display */}
                  {areAllConditionalFieldsFilled() && generatePositionTitle() && (
                    <div className="mt-4">
                      <Label>Position</Label>
                      <div className="p-3 bg-muted rounded-md border">
                        <span className="font-medium text-primary">{generatePositionTitle()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This position is automatically generated based on your role and selections above.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="systemRole">System Role *</Label>
                <Select 
                  value={formData.systemRole} 
                  onValueChange={(value) => handleInputChange("systemRole", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select system role" />
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
            </CardContent>
          </Card>


          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Create User
            </Button>
          </div>
        </form>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Confirm User Creation</h3>
              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-sm font-medium">Name:</span>
                  <span className="ml-2">{formData.firstName} {formData.lastName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <span className="ml-2">{formData.email}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Company:</span>
                  <span className="ml-2">{formData.company === "Others" ? formData.otherCompany : formData.company}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Role:</span>
                  <span className="ml-2">{formData.role}</span>
                </div>
                {generatePositionTitle() && (
                  <div>
                    <span className="text-sm font-medium">Position:</span>
                    <span className="ml-2 font-medium text-primary">{generatePositionTitle()}</span>
                  </div>
                )}
                {formData.commission && (
                  <div>
                    <span className="text-sm font-medium">Commission:</span>
                    <span className="ml-2">{formData.commission}</span>
                  </div>
                )}
                {formData.plant && (
                  <div>
                    <span className="text-sm font-medium">Plant:</span>
                    <span className="ml-2">{formData.plant}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Temporary Password:</span>
                  <span className="ml-2 font-mono bg-muted px-2 py-1 rounded">{generatedPassword}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The user will receive an email with their login credentials and will be automatically activated.
              </p>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmation(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmCreate}
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCreating ? "Creating..." : "Confirm & Create"}
                </Button>
              </div>
            </div>
          </div>
        )}
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

export default CreateUserModal;