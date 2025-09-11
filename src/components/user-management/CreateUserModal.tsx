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

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser?: (userData: any) => void;
  onUserCreated?: () => void;
}

const CreateUserModal = ({ isOpen, onClose, onCreateUser, onUserCreated }: CreateUserModalProps) => {
  const { toast } = useToast();
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
    systemRole: "user", // Default system role
    privileges: [] as string[],
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
  
  // Load custom roles from localStorage
  const getCustomRoles = () => {
    try {
      const stored = localStorage.getItem('customRoles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [customRoles, setCustomRoles] = useState<string[]>(getCustomRoles);

  const companies = [
    { value: "BGC", label: "Basrah Gas Company (BGC)", logo: "/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" },
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

  // Base roles that are always available
  const baseRoles = [
    "Project Manager",
    "Commissioning Lead",
    "Construction Lead", 
    "Technical Authority (TA2)",
    "Plant Director",
    "Deputy Plant Director",
    "Operations Coach",
    "Operation Readiness & Assurance Engineer",
    "Site Engineer",
    "Ops HSE Lead",
    "Project HSE Lead",
    "ER Lead",
    "Production Director",
    "HSE Director",
    "P&E Director",
    "Engr. Manager (P&E)",
    "Engr. Manager (Asset)",
  ];

  // Combine base roles with custom roles
  const allRoles = [...baseRoles, ...customRoles].sort();

  const disciplines = [
    { value: "Civil", label: "Civil" },
    { value: "Static", label: "Static" },
    { value: "PACO", label: "PACO" },
    { value: "Process", label: "Process" },
    { value: "Technical Safety", label: "Technical Safety" },
  ];

  const commissions = [
    { value: "Asset", label: "Asset" },
    { value: "Project and Engineering", label: "Project and Engineering" },
  ];

  const availablePrivileges = [
    "Administrator",
    "Complete assigned tasks or delegate", 
    "Edit PSSR Checklist item Default approvers and PSSR Approvers",
    "Edit or Create New User",
    "Edit or Create New Project",
    "Edit or Create New PSSR Master Checklist",
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
    ? allRoles.filter(role => role.toLowerCase().includes(roleSearch.toLowerCase()))
    : allRoles;

  // Function to save custom roles to localStorage
  const saveCustomRoles = (roles: string[]) => {
    try {
      localStorage.setItem('customRoles', JSON.stringify(roles));
      setCustomRoles(roles);
    } catch (error) {
      console.error('Failed to save custom roles:', error);
    }
  };

  // Function to add a new role
  const addNewRole = () => {
    if (formData.newRole.trim() && !allRoles.includes(formData.newRole.trim())) {
      const newCustomRoles = [...customRoles, formData.newRole.trim()];
      saveCustomRoles(newCustomRoles);
      handleInputChange("role", formData.newRole.trim());
      handleInputChange("newRole", "");
      setShowNewRoleInput(false);
      setShowRoleDropdown(false);
      setRoleSearch("");
      
      toast({
        title: "Role Added",
        description: `"${formData.newRole.trim()}" has been added to the available roles.`,
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrivilegeToggle = (privilege: string) => {
    setFormData(prev => ({
      ...prev,
      privileges: prev.privileges.includes(privilege)
        ? prev.privileges.filter(p => p !== privilege)
        : [...prev.privileges, privilege]
    }));
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
    if (!file.type.startsWith('image/')) {
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

    setProfileImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
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
  };

  const uploadProfileImage = async (userId: string): Promise<string | null> => {
    if (!profileImage) return null;

    try {
      setUploadingImage(true);
      
      // Create unique filename
      const fileExt = profileImage.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, profileImage, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      return fileName;
    } catch (error) {
      console.error('Avatar upload error:', error);
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
      // First, create the user to get the user ID
      const { data: createResp, error: createErr } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: generatedPassword,
          company: formData.company === "Others" ? null : formData.company,
          role: formData.role,
          phone: formData.countryCode + formData.phone,
          personalEmail: formData.personalEmail || null,
          functionalEmail: formData.functionalEmail || null,
          isFunctionalEmail: formData.isFunctionalEmail,
          discipline: formData.discipline || null,
          commission: formData.commission || null,
          systemRole: formData.systemRole,
          privileges: formData.privileges,
        }
      });

      if (createErr) {
        throw createErr;
      }

      // If user created successfully and there's a profile image, upload it
      let avatarUrl = null;
      if (profileImage && createResp?.user_id) {
        avatarUrl = await uploadProfileImage(createResp.user_id);
        
        // Update the user profile with avatar URL
        if (avatarUrl) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('user_id', createResp.user_id);
            
          if (updateError) {
            console.error('Failed to update avatar URL:', updateError);
          }
        }
      }

      // Try to send welcome email (non-blocking)
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            userEmail: formData.email,
            userName: `${formData.firstName} ${formData.lastName}`,
            temporaryPassword: generatedPassword,
            loginUrl: `${window.location.origin}/auth`
          }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
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
        systemRole: "user",
        privileges: [],
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
      console.error('Error creating user:', error);
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
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-start gap-4">
                  {/* Avatar Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-20 w-20">
                      {profileImagePreview ? (
                        <AvatarImage src={profileImagePreview} alt="Profile preview" />
                      ) : (
                        <AvatarFallback>
                          <User className="h-8 w-8" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {profileImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearImage}
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Upload Area */}
                  <div className="flex-1 space-y-2">
                    {/* Drag & Drop Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOver 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop an image here, or click to browse
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="profile-image-upload"
                        disabled={uploadingImage}
                        ref={(input) => {
                          if (input) {
                            input.onclick = () => input.click();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('profile-image-upload')?.click()}
                        disabled={uploadingImage}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, PNG, GIF. Max size: 5MB
                    </p>
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
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="functionalEmail"
                    checked={formData.isFunctionalEmail}
                    onCheckedChange={(checked) => handleInputChange("isFunctionalEmail", checked)}
                  />
                  <Label htmlFor="functionalEmail">Add a functional email</Label>
                </div>
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
                              fontSize: '14px',
                              lineHeight: '16px'
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
                    <SelectContent className="max-h-60 overflow-y-auto bg-popover border shadow-lg z-50">
                      {countryCodes.map((country) => (
                        <SelectItem key={`${country.code}-${country.shortName}`} value={country.code} className="cursor-pointer py-2 hover:bg-accent">
                          <div className="flex items-center gap-3 w-full">
                            <div 
                              className="flex items-center justify-center min-w-[28px] h-[20px] text-center border border-border/20 rounded-sm bg-muted/30"
                              style={{ 
                                fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji", "EmojiOne", sans-serif',
                                fontSize: '16px',
                                lineHeight: '20px'
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
                <Label htmlFor="role">Role *</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search roles..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      onFocus={() => setShowRoleDropdown(true)}
                      onBlur={() => {
                        // Delay hiding to allow clicking on dropdown items
                        setTimeout(() => setShowRoleDropdown(false), 150);
                      }}
                      className="pl-10"
                    />
                  </div>
                  
                  {showRoleDropdown && (
                    <div className="border rounded-lg bg-popover p-2 space-y-1 max-h-48 overflow-y-auto shadow-lg z-50 relative">
                      {filteredRoles.length > 0 ? (
                        <>
                          {filteredRoles.map((role) => (
                            <Button
                              key={role}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left hover:bg-accent"
                              onClick={() => {
                                handleInputChange("role", role);
                                setRoleSearch("");
                                setShowRoleDropdown(false);
                              }}
                            >
                              {role}
                            </Button>
                          ))}
                          {roleSearch && !filteredRoles.some(role => role.toLowerCase() === roleSearch.toLowerCase()) && (
                            <div className="border-t mt-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  setShowNewRoleInput(true);
                                  setShowRoleDropdown(false);
                                  handleInputChange("newRole", roleSearch);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add "{roleSearch}" as new role
                              </Button>
                            </div>
                          )}
                        </>
                      ) : roleSearch ? (
                        <div className="p-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            No roles found matching "{roleSearch}"
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowNewRoleInput(true);
                              setShowRoleDropdown(false);
                              handleInputChange("newRole", roleSearch);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add "{roleSearch}" as new role
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setShowNewRoleInput(true);
                              setShowRoleDropdown(false);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Custom Role
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
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
                  
                  {formData.role && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-foreground">{formData.role}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInputChange("role", "")}
                        className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                        title="Remove selected role"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {formData.role === "Technical Authority (TA2)" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discipline">Discipline</Label>
                    <Select onValueChange={(value) => handleInputChange("discipline", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map((discipline) => (
                          <SelectItem key={discipline.value} value={discipline.value}>
                            {discipline.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="commission">Commission</Label>
                    <Select onValueChange={(value) => handleInputChange("commission", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissions.map((commission) => (
                          <SelectItem key={commission.value} value={commission.value}>
                            {commission.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="systemRole">System Role *</Label>
                <Select 
                  value={formData.systemRole} 
                  onValueChange={(value) => handleInputChange("systemRole", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select system role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
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

          {/* Privileges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privileges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availablePrivileges.map((privilege) => (
                  <div key={privilege} className="flex items-center space-x-2">
                    <Checkbox
                      id={privilege}
                      checked={formData.privileges.includes(privilege)}
                      onCheckedChange={() => handlePrivilegeToggle(privilege)}
                    />
                    <Label htmlFor={privilege} className="text-sm">
                      {privilege}
                    </Label>
                  </div>
                ))}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
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
                <div>
                  <span className="text-sm font-medium">Temporary Password:</span>
                  <span className="ml-2 font-mono bg-muted px-2 py-1 rounded">{generatedPassword}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Privileges:</span>
                  <div className="ml-2 mt-1">
                    {formData.privileges.length > 0 ? (
                      <ul className="text-sm space-y-1">
                        {formData.privileges.map((privilege, index) => (
                          <li key={index}>• {privilege}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">No privileges assigned</span>
                    )}
                  </div>
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
                >
                  {isCreating ? "Creating..." : "Confirm & Create User"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;