import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Mail,
  Phone,
  Building,
  User,
  Shield,
  Settings,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHubs } from '@/hooks/useHubs';

// Type definitions matching the database schema exactly
interface DatabaseUser {
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: 'BGC' | 'KENT' | null;
  employee_id: string | null;
  phone_number: string | null;
  account_status: string | null;
  status: 'active' | 'inactive' | 'pending_approval' | 'suspended' | null;
  last_login_at: string | null;
  created_at: string;
  sso_enabled: boolean | null;
  two_factor_enabled: boolean | null;
  avatar_url: string | null;
  role: string;
  roles: string[];
  projects: string[];
  manager_name: string | null;
  pending_actions: number;
  login_attempts: number | null;
  locked_until: string | null;
  password_change_required: boolean | null;
  last_activity: string | null;
  ta2_discipline: string | null;
  ta2_commission: string | null;
  functional_email_address: string | null;
  personal_email: string | null;
  functional_email: boolean | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  country_code: string | null;
  position?: string | null;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata: any;
}

interface EnhancedUserDetailsModalProps {
  user: DatabaseUser;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  initialEditMode?: boolean;
}

const EnhancedUserDetailsModal: React.FC<EnhancedUserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
  initialEditMode = false,
}) => {
  const [editMode, setEditMode] = useState(initialEditMode);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  
  // Form state matching database fields exactly
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    functional_email_address: '',
    phone_number: '',
    primary_phone: '',
    secondary_phone: '',
    country_code: '',
    role: '',
    discipline: '',
    commission: '',
    plant: '',
    station: '',
    field: '',
    hub: '',
    company: 'BGC' as 'BGC' | 'KENT' | null,
    status: 'active' as 'active' | 'inactive' | 'pending_approval' | 'suspended',
    account_status: '',
    sso_enabled: false,
    two_factor_enabled: false,
    password_change_required: false,
    functional_email: false,
    position: ''
  });

  const { data: hubs } = useHubs();

  // Function to generate dynamic title based on role and conditional fields
  const generateTitle = () => {
    const { role, commission, plant, station, field, hub } = formData;
    
    if (!role) return '';
    
    // Handle hub-based roles first
    if (['Proj Manager', 'Proj Engr', 'Commissioning Lead', 'Construction Lead'].includes(role) && hub) {
      switch (role) {
        case 'Proj Manager':
          return `Proj Manager – ${hub}`;
        case 'Proj Engr':
          return `Proj Engr – ${hub}`;
        case 'Commissioning Lead':
          return `Commissioning Lead – ${hub}`;
        case 'Construction Lead':
          return `Construction Lead – ${hub}`;
      }
    }
    
    // Handle other role combinations
    switch (role) {
      case 'Director':
        return commission ? `${commission} Director` : '';
      
      case 'Plant Director':
        return plant ? `${plant} Plant Director` : '';
      
      case 'Dep. Plant Director':
        return plant ? `${plant} Dep. Plant Director` : '';
      
      case 'Site Engineer':
        return station ? `Site Engr – ${station}` : '';
      
      case 'Ops Coach':
        return field ? `Ops Coach – ${field}` : '';
      
      case 'Ops Team Lead':
        return field ? `Ops Team Lead – ${field}` : '';
      
      case 'Engr. Manager':
        return commission ? `Engr. Manager – ${commission}` : '';
      
      case 'HSE Lead':
        return commission ? `HSE Lead – ${commission}` : '';
      
      default:
        return '';
    }
  };

  // Check if all required fields for title generation are completed
  const isTitleReady = () => {
    const { role, commission, plant, station, field, hub } = formData;
    
    if (!role) return false;
    
    // Hub-based roles
    if (['Proj Manager', 'Proj Engr', 'Commissioning Lead', 'Construction Lead'].includes(role)) {
      return !!hub;
    }
    
    switch (role) {
      case 'Director':
      case 'Engr. Manager':
      case 'HSE Lead':
        return !!commission;
      case 'Plant Director':
      case 'Dep. Plant Director':
        return !!plant;
      case 'Site Engineer':
        return !!station;
      case 'Ops Coach':
      case 'Ops Team Lead':
        return !!field;
      default:
        return false;
    }
  };

  // Check if role requires hub selection
  const requiresHub = (role: string) => {
    return ['Proj Manager', 'Proj Engr', 'Commissioning Lead', 'Construction Lead', 'ORA Engineer'].includes(role);
  };

  const [systemRole, setSystemRole] = useState('user');
  const [databaseRoles, setDatabaseRoles] = useState<Array<{value: string, label: string}>>([]);
  const [commissions, setCommissions] = useState<Array<{value: string, label: string}>>([]);
  const [disciplines, setDisciplines] = useState<Array<{value: string, label: string}>>([]);
  const [plants, setPlants] = useState<Array<{value: string, label: string}>>([]);
  const [stations, setStations] = useState<Array<{value: string, label: string}>>([]);
  const [fields, setFields] = useState<Array<{value: string, label: string}>>([]);

  const systemRoles = [
    { value: "user", label: "User" },
    { value: "admin", label: "Administrator" },
    { value: "manager", label: "Manager" },
    { value: "engineer", label: "Engineer" },
    { value: "safety_officer", label: "Safety Officer" },
    { value: "technical_authority", label: "Technical Authority" },
  ];

  const companies = [
    { value: "BGC", label: "BGC", logo: "/lovable-uploads/5d0026a9-ed76-4745-9f0f-6a8a5e37993c.png" },
    { value: "KENT", label: "Kent", logo: "/lovable-uploads/96910863-cffb-404b-b5f0-149d393a07df.png" },
    { value: "Others", label: "Others" }
  ];

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

  const statusOptions = [
    { value: "active", label: "Active", color: "text-green-600" },
    { value: "inactive", label: "Inactive", color: "text-gray-600" },
    { value: "pending_approval", label: "Pending Approval", color: "text-yellow-600" },
    { value: "suspended", label: "Suspended", color: "text-red-600" }
  ];

  // Fetch database options
  const fetchDatabaseOptions = async () => {
    try {
      // Fetch roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      setDatabaseRoles(rolesData?.map(r => ({ value: r.name, label: r.name })) || []);

      // Fetch commissions
      const { data: commissionsData } = await supabase
        .from('commission')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      setCommissions(commissionsData?.map(c => ({ value: c.name, label: c.name })) || []);

      // Fetch disciplines
      const { data: disciplinesData } = await supabase
        .from('discipline')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      setDisciplines(disciplinesData?.map(d => ({ value: d.name, label: d.name })) || []);

      // Fetch plants
      const { data: plantsData } = await supabase
        .from('plant')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      setPlants(plantsData?.map(p => ({ value: p.name, label: p.name })) || []);

      // Fetch stations
      const { data: stationsData } = await supabase
        .from('station')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      setStations(stationsData?.map(s => ({ value: s.name, label: s.name })) || []);

      // Fetch fields
      const { data: fieldsData } = await supabase
        .from('field')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      setFields(fieldsData?.map(f => ({ value: f.name, label: f.name })) || []);
    } catch (error) {
      console.error('Error fetching database options:', error);
    }
  };

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        functional_email_address: user.functional_email_address || '',
        phone_number: user.phone_number || '',
        primary_phone: user.primary_phone || '',
        secondary_phone: user.secondary_phone || '',
        country_code: user.country_code || '+964',
        role: user.role || '',
        discipline: user.ta2_discipline || '',
        commission: user.ta2_commission || '',
        plant: '',
        station: '',
        field: '',
        hub: '',
        company: user.company || 'BGC',
        status: user.status || 'active',
        account_status: user.account_status || 'active',
        sso_enabled: user.sso_enabled || false,
        two_factor_enabled: user.two_factor_enabled || false,
        password_change_required: user.password_change_required || false,
        functional_email: user.functional_email || false,
        position: user.position || ''
      });
      
      setSystemRole(user.roles?.[0] || 'user');
      setLocalAvatarUrl(user.avatar_url ? `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${user.avatar_url}` : null);
      
      fetchDatabaseOptions();
      fetchActivityLogs();
      fetchUserSessions();
    }
  }, [isOpen, user]);

  const fetchActivityLogs = async () => {
    if (!user?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching activity logs:', error);
        return;
      }

      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchUserSessions = async () => {
    if (!user?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        return;
      }

      setUserSessions(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      console.log('Saving user data:', formData);

      // Generate position based on role and conditional fields
      const generatedPosition = generateTitle();

      // Helper function to get the database ID for related entities
      const getRoleId = async (roleName: string) => {
        if (!roleName) return null;
        const { data } = await supabase
          .from('roles')
          .select('id')
          .eq('name', roleName)
          .single();
        return data?.id || null;
      };

      const getCommissionId = async (commissionName: string) => {
        if (!commissionName) return null;
        const { data } = await supabase
          .from('commission')
          .select('id')
          .eq('name', commissionName)
          .single();
        return data?.id || null;
      };

      const getPlantId = async (plantName: string) => {
        if (!plantName) return null;
        const { data } = await supabase
          .from('plant')
          .select('id')
          .eq('name', plantName)
          .single();
        return data?.id || null;
      };

      const getStationId = async (stationName: string) => {
        if (!stationName) return null;
        const { data } = await supabase
          .from('station')
          .select('id')
          .eq('name', stationName)
          .single();
        return data?.id || null;
      };

      const getFieldId = async (fieldName: string) => {
        if (!fieldName) return null;
        const { data } = await supabase
          .from('field')
          .select('id')
          .eq('name', fieldName)
          .single();
        return data?.id || null;
      };

      // Get IDs for foreign key relationships
      const [roleId, commissionId, plantId, stationId, fieldId] = await Promise.all([
        getRoleId(formData.role),
        getCommissionId(formData.commission),
        getPlantId(formData.plant),
        getStationId(formData.station),
        getFieldId(formData.field)
      ]);

      // Prepare update payload with proper field mapping
      const updatePayload = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        full_name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || null,
        email: formData.email,
        functional_email_address: formData.functional_email_address || null,
        phone_number: formData.phone_number || null,
        primary_phone: formData.primary_phone || null,
        secondary_phone: formData.secondary_phone || null,
        country_code: formData.country_code || null,
        role: roleId,
        commission: commissionId,
        plant: plantId,
        station: stationId,
        field: fieldId,
        position: generatedPosition || null,
        company: formData.company,
        status: formData.status,
        account_status: formData.account_status || 'active',
        sso_enabled: formData.sso_enabled,
        two_factor_enabled: formData.two_factor_enabled,
        password_change_required: formData.password_change_required,
        functional_email: formData.functional_email,
        updated_at: new Date().toISOString()
      };

      console.log('Update payload:', updatePayload);

      // Update the profile using service role via edge function for better RLS handling
      const { data: updateResponse, error: profileError } = await supabase.functions.invoke('update-user-profile', {
        body: {
          userId: user.user_id,
          profileData: updatePayload
        }
      });

      if (profileError) {
        console.error('Profile update error:', profileError);
        toast.error(`Failed to update user: ${profileError.message}`);
        return;
      }

      console.log('Profile update response:', updateResponse);

      // Update system role if it changed
      if (systemRole !== (user.roles?.[0] || 'user')) {
        console.log('Updating system role from', user.roles?.[0], 'to', systemRole);
        
        // Delete existing roles
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        if (deleteError) {
          console.error('Error deleting existing roles:', deleteError);
        }

        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.user_id,
            role: systemRole as any,
            granted_by: user.user_id
          });

        if (roleError) {
          console.error('Error updating system role:', roleError);
          toast.error(`Failed to update system role: ${roleError.message}`);
          return;
        }
      }

      toast.success('User updated successfully');
      setEditMode(false);
      onUserUpdated(); // Refresh the parent list
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`An error occurred while updating user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.user_id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user_id}/${Date.now()}.${fileExt}`;

      // Read file as base64
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const dataUrl = await toBase64(file);
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      // Upload via edge function (service role) which also updates the profile
      const { data: uploadResp, error: uploadFnErr } = await supabase.functions.invoke('upload-user-avatar', {
        body: {
          userId: user.user_id,
          fileExt: fileExt || 'png',
          contentType: file.type,
          base64
        }
      });

      if (uploadFnErr) {
        toast.error('Failed to upload image');
        console.error('Upload function error:', uploadFnErr);
        return;
      }

      // Update local preview immediately
      if ((uploadResp as any)?.publicUrl) {
        setLocalAvatarUrl((uploadResp as any).publicUrl);
      }

      console.log('Avatar upload response:', uploadResp);
      toast.success('Profile picture updated successfully');
      
      // Force refresh the user data in the parent component
      onUserUpdated();
    } catch (error) {
      toast.error('An error occurred while uploading');
      console.error('Avatar upload error:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'text-gray-600';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Function to add new entries to database tables
  const addNewEntry = async (table: 'roles' | 'discipline' | 'commission' | 'plant' | 'station' | 'field', name: string) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert({ name })
        .select()
        .single();

      if (error) {
        console.error(`Error adding new ${table}:`, error);
        toast.error(`Failed to add new ${table}`);
        return null;
      }

      toast.success(`New ${table} "${name}" added successfully`);
      return data as { name: string };
    } catch (error) {
      console.error(`Error adding new ${table}:`, error);
      toast.error(`Failed to add new ${table}`);
      return null;
    }
  };

  // Custom handlers for combobox changes with new entry creation
  const handleRoleChange = async (value: string) => {
    if (value && !databaseRoles.find(r => r.value === value)) {
      const newRole = await addNewEntry('roles', value);
      if (newRole) {
        setDatabaseRoles(prev => [...prev, { value: newRole.name, label: newRole.name }]);
      }
    }
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleDisciplineChange = async (value: string) => {
    if (value && !disciplines.find(d => d.value === value)) {
      const newDiscipline = await addNewEntry('discipline', value);
      if (newDiscipline) {
        setDisciplines(prev => [...prev, { value: newDiscipline.name, label: newDiscipline.name }]);
      }
    }
    setFormData(prev => ({ ...prev, discipline: value }));
  };

  const handleCommissionChange = async (value: string) => {
    if (value && !commissions.find(c => c.value === value)) {
      const newCommission = await addNewEntry('commission', value);
      if (newCommission) {
        setCommissions(prev => [...prev, { value: newCommission.name, label: newCommission.name }]);
      }
    }
    setFormData(prev => ({ ...prev, commission: value }));
  };

  // Get filtered commissions for HSE Lead and Engr. Manager roles
  const getCommissionOptions = () => {
    if (formData.role === 'HSE Lead' || formData.role === 'Engr. Manager') {
      return commissions.filter(c => c.value === 'P&E' || c.value === 'Asset');
    }
    return commissions;
  };

  // Get filtered hubs for specific roles
  const getFilteredHubOptions = () => {
    if (formData.role === 'ORA Engineer') {
      return hubs.filter(h => ['North', 'Central', 'South'].includes(h.name));
    }
    return hubs;
  };

  const handlePlantChange = async (value: string) => {
    if (value && !plants.find(p => p.value === value)) {
      const newPlant = await addNewEntry('plant', value);
      if (newPlant) {
        setPlants(prev => [...prev, { value: newPlant.name, label: newPlant.name }]);
      }
    }
    setFormData(prev => ({ ...prev, plant: value }));
  };

  const handleStationChange = async (value: string) => {
    if (value && !stations.find(s => s.value === value)) {
      const newStation = await addNewEntry('station', value);
      if (newStation) {
        setStations(prev => [...prev, { value: newStation.name, label: newStation.name }]);
      }
    }
    setFormData(prev => ({ ...prev, station: value }));
  };

  const handleFieldChange = async (value: string) => {
    if (value && !fields.find(f => f.value === value)) {
      const newField = await addNewEntry('field', value);
      if (newField) {
        setFields(prev => [...prev, { value: newField.name, label: newField.name }]);
      }
    }
    setFormData(prev => ({ ...prev, field: value }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-border">
                  {(localAvatarUrl || user.avatar_url) && (
                    <AvatarImage 
                      src={localAvatarUrl ?? `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${user.avatar_url}`}
                      alt={user.full_name || 'User'} 
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold">
                    {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                {editMode && (
                  <div className="absolute -bottom-1 -right-1">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 shadow-sm">
                        <Camera className="h-3 w-3" />
                      </div>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.full_name || 'Unknown User'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="outline" className={getStatusColor(user.status || 'inactive')}>
                  {user.status || 'inactive'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!editMode ? (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="functional-email"
                      checked={formData.functional_email}
                      onCheckedChange={(checked) => handleInputChange('functional_email', checked)}
                      disabled={!editMode}
                    />
                    <Label htmlFor="functional-email" className="text-sm">
                      This is a functional email
                    </Label>
                  </div>
                </div>

                {formData.functional_email && (
                  <div>
                    <Label htmlFor="functional_email_address">Functional Email Address</Label>
                    <Input
                      id="functional_email_address"
                      type="email"
                      value={formData.functional_email_address}
                      onChange={(e) => handleInputChange('functional_email_address', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                      placeholder="functional@company.com"
                    />
                  </div>
                )}

                {/* Contact Information */}
                <Separator />
                <h3 className="text-lg font-semibold">Contact Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_phone">Primary Phone</Label>
                    {editMode ? (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <Select
                          value={formData.country_code}
                          onValueChange={(value) => handleInputChange('country_code', value)}
                          disabled={!editMode}
                        >
                          <SelectTrigger className={`w-32 ${!editMode ? 'bg-muted' : ''}`}>
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
                          id="primary_phone"
                          type="tel"
                          value={formData.primary_phone}
                          onChange={(e) => handleInputChange('primary_phone', e.target.value)}
                          disabled={!editMode}
                          className={`flex-1 ${!editMode ? 'bg-muted' : ''}`}
                          placeholder="Phone number"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-muted rounded-md border">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formData.country_code && formData.primary_phone 
                            ? `${formData.country_code} ${formData.primary_phone}`
                            : formData.phone_number || 'Not provided'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="secondary_phone">Secondary Phone</Label>
                    <Input
                      id="secondary_phone"
                      type="tel"
                      value={formData.secondary_phone}
                      onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                      disabled={!editMode}
                      className={!editMode ? 'bg-muted' : ''}
                      placeholder="Optional secondary phone"
                    />
                  </div>
                </div>

                {/* Company and Role */}
                <Separator />
                <h3 className="text-lg font-semibold">Company & Role Information</h3>
                
                <div>
                  <Label>Company *</Label>
                  <Select
                    value={formData.company || ''}
                    onValueChange={(value) => handleInputChange('company', value as 'BGC' | 'KENT')}
                    disabled={!editMode}
                  >
                    <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
                      <SelectValue placeholder="Select company" />
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

                {/* Role and conditional fields */}
                <div className="space-y-4">
                  {editMode ? (
                    <>
                      {/* Role and conditional fields on same row - Edit Mode Only */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                        {/* Primary Role Field */}
                        <div>
                          <Label>Role *</Label>
                          <Combobox
                            value={formData.role}
                            onValueChange={handleRoleChange}
                            options={databaseRoles}
                            placeholder="Select role"
                            searchPlaceholder="Search roles..."
                            emptyText="No roles found"
                            allowCustom={editMode}
                            onAddCustom={handleRoleChange}
                            className={!editMode ? 'bg-muted pointer-events-none' : ''}
                          />
                        </div>

                        {/* Conditional fields based on role */}
                        {formData.role === 'Director' && (
                          <div>
                            <Label>Commission *</Label>
                            <Combobox
                              value={formData.commission}
                              onValueChange={handleCommissionChange}
                              options={commissions}
                              placeholder="Select commission"
                              searchPlaceholder="Search commissions..."
                              emptyText="No commissions found"
                              allowCustom={editMode}
                              onAddCustom={handleCommissionChange}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}

                        {(formData.role === 'Plant Director' || formData.role === 'Dep. Plant Director') && (
                          <div>
                            <Label>Plant *</Label>
                            <Combobox
                              value={formData.plant}
                              onValueChange={handlePlantChange}
                              options={plants}
                              placeholder="Select plant"
                              searchPlaceholder="Search plants..."
                              emptyText="No plants found"
                              allowCustom={editMode}
                              onAddCustom={handlePlantChange}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}

                        {formData.role === 'Site Engineer' && (
                          <div>
                            <Label>Station *</Label>
                            <Combobox
                              value={formData.station}
                              onValueChange={handleStationChange}
                              options={stations}
                              placeholder="Select station"
                              searchPlaceholder="Search stations..."
                              emptyText="No stations found"
                              allowCustom={editMode}
                              onAddCustom={handleStationChange}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}

                        {(formData.role === 'Ops Coach' || formData.role === 'Ops Team Lead') && (
                          <div>
                            <Label>Field *</Label>
                            <Combobox
                              value={formData.field}
                              onValueChange={handleFieldChange}
                              options={fields}
                              placeholder="Select field"
                              searchPlaceholder="Search fields..."
                              emptyText="No fields found"
                              allowCustom={editMode}
                              onAddCustom={handleFieldChange}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}

                        {formData.role === 'Engr. Manager' && (
                          <div>
                            <Label>Commission *</Label>
                            <Combobox
                              value={formData.commission}
                              onValueChange={handleCommissionChange}
                              options={getCommissionOptions()}
                              placeholder="Select commission (P&E or Asset only)"
                              searchPlaceholder="Search commissions..."
                              emptyText="No commissions found"
                              allowCustom={editMode}
                              onAddCustom={handleCommissionChange}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}

                        {formData.role === 'HSE Lead' && (
                          <div>
                            <Label>Commission *</Label>
                            <Combobox
                              value={formData.commission}
                              onValueChange={handleCommissionChange}
                              options={getCommissionOptions()}
                              placeholder="Select commission (P&E or Asset only)"
                              searchPlaceholder="Search commissions..."
                              emptyText="No commissions found"
                              allowCustom={editMode}
                              onAddCustom={handleCommissionChange}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}

                        {requiresHub(formData.role) && (
                          <div>
                            <Label>Hub *</Label>
                            <Combobox
                              value={formData.hub}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, hub: value }))}
                              options={getFilteredHubOptions().map(hub => ({ value: hub.name, label: hub.name }))}
                              placeholder={formData.role === 'ORA Engineer' ? "Select hub (North, Central, or South)" : "Select hub"}
                              searchPlaceholder="Search hubs..."
                              emptyText="No hubs found"
                              allowCustom={editMode}
                              className={!editMode ? 'bg-muted pointer-events-none' : ''}
                            />
                          </div>
                        )}
                      </div>

                      {/* Position Display - Separate row in Edit Mode */}
                      {isTitleReady() && (
                        <div>
                          <Label>Position</Label>
                          <div className="p-3 bg-muted rounded-md border">
                            <span className="font-medium text-primary">{generateTitle()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            This position is automatically generated based on your role and selections above.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* View Mode - Only show Position */
                    isTitleReady() && (
                      <div>
                        <Label>Position</Label>
                        <div className="p-3 bg-muted rounded-md border">
                          <span className="font-medium text-primary">{generateTitle()}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* System Role */}
                <div>
                  <Label>System Role</Label>
                  <Select
                    value={systemRole}
                    onValueChange={setSystemRole}
                    disabled={!editMode}
                  >
                    <SelectTrigger className={!editMode ? 'bg-muted' : ''}>
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
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Account Status</Label>
                    <p className="text-sm text-muted-foreground">Current status of the user account</p>
                  </div>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={!editMode}
                  >
                    <SelectTrigger className={`w-48 ${!editMode ? 'bg-muted' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className={status.color}>{status.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SSO Authentication</Label>
                    <p className="text-sm text-muted-foreground">Enable single sign-on authentication</p>
                  </div>
                  <Switch
                    checked={formData.sso_enabled}
                    onCheckedChange={(checked) => handleInputChange('sso_enabled', checked)}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for additional security</p>
                  </div>
                  <Switch
                    checked={formData.two_factor_enabled}
                    onCheckedChange={(checked) => handleInputChange('two_factor_enabled', checked)}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password Change Required</Label>
                    <p className="text-sm text-muted-foreground">Force user to change password on next login</p>
                  </div>
                  <Switch
                    checked={formData.password_change_required}
                    onCheckedChange={(checked) => handleInputChange('password_change_required', checked)}
                    disabled={!editMode}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.activity_type}</TableCell>
                        <TableCell>{log.description}</TableCell>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedUserDetailsModal;