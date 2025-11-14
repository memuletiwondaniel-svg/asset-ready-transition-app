import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Camera, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { AvatarCropDialog } from './AvatarCropDialog';
import { ChangePasswordModal } from './ChangePasswordModal';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { DisableTwoFactorModal } from './DisableTwoFactorModal';
import { Badge } from '@/components/ui/badge';
import { usePositions } from '@/hooks/usePositions';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onOpenChange,
  onProfileUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showTwoFactorSetupModal, setShowTwoFactorSetupModal] = useState(false);
  const [showDisableTwoFactorModal, setShowDisableTwoFactorModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: positions, isLoading: positionsLoading } = usePositions();

  // Fetch current profile data
  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        toast({
          title: 'Authentication Error',
          description: 'Unable to verify user identity. Please sign in again.',
          variant: 'destructive'
        });
        return;
      }

      if (!user) {
        toast({
          title: 'Not Authenticated',
          description: 'Please sign in to edit your profile.',
          variant: 'destructive'
        });
        onOpenChange(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || '');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, position, phone_number, avatar_url, two_factor_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      if (profile) {
        setFullName(profile.full_name || '');
        setPosition(profile.position || '');
        setPhoneNumber(profile.phone_number || '');
        setTwoFactorEnabled(profile.two_factor_enabled || false);
        
        let avatarUrlFull = profile.avatar_url || '';
        if (avatarUrlFull && !avatarUrlFull.startsWith('http')) {
          const { data: { publicUrl } } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(avatarUrlFull);
          avatarUrlFull = publicUrl;
        }
        setAvatarUrl(avatarUrlFull);
        setAvatarPreview(avatarUrlFull);
      } else {
        // Profile doesn't exist yet, that's okay - user can create it
        console.log('No profile found for user, will create on save');
      }
    } catch (error: any) {
      console.error('Unexpected error fetching profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar image must be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WEBP image',
        variant: 'destructive'
      });
      return;
    }

    // Create preview and open crop dialog
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImageSrc(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setCroppedImageBlob(croppedBlob);
    
    // Create preview from cropped blob
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedBlob);
    
    setShowCropDialog(false);
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setSelectedImageSrc('');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    // Use cropped image if available, otherwise fall back to original file
    const fileToUpload = croppedImageBlob || fileInputRef.current?.files?.[0];
    if (!fileToUpload || !userId) return null;

    try {
      setUploading(true);

      // Convert file/blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileToUpload);
      });

      // Determine file extension
      const fileExt = croppedImageBlob ? 'jpg' : (fileToUpload as File).name.split('.').pop();

      // Call the edge function to upload avatar
      const { data, error } = await supabase.functions.invoke('upload-user-avatar', {
        body: {
          userId,
          fileExt,
          contentType: croppedImageBlob ? 'image/jpeg' : (fileToUpload as File).type,
          base64
        }
      });

      if (error) throw error;

      return data.avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar image',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!fullName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Please enter your full name',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Upload avatar if a new one was selected (check for cropped image or file input)
      let newAvatarUrl = avatarUrl;
      if (croppedImageBlob || fileInputRef.current?.files?.[0]) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        }
      }

      // Update or insert profile data
      const { error } = await supabase
        .from('profiles')
        .upsert([{
          user_id: userId,
          email: userEmail,
          full_name: fullName.trim(),
          position: position.trim() || null,
          phone_number: phoneNumber.trim() || null,
          avatar_url: newAvatarUrl || null,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving profile:', error);
        throw error;
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully'
      });

      // Reset cropped image state
      setCroppedImageBlob(null);
      
      onProfileUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and avatar image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview} alt={fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl">
                  {fullName.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <p className="text-xs text-muted-foreground text-center">
              Click the camera icon to upload a new avatar<br />
              JPG, PNG, or WEBP (max 5MB)
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          {/* Position/Title */}
          <div className="space-y-2">
            <Label htmlFor="position">Position / Title *</Label>
            <Select 
              value={position} 
              onValueChange={setPosition}
              disabled={loading || positionsLoading}
            >
              <SelectTrigger id="position">
                <SelectValue placeholder="Select your position" />
              </SelectTrigger>
              <SelectContent>
                {positions?.map((pos) => (
                  <SelectItem key={pos.id} value={pos.name}>
                    {pos.name}
                    {pos.department && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({pos.department})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., +1 (555) 123-4567"
              disabled={loading}
            />
          </div>

          {/* Change Password Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowChangePasswordModal(true)}
              className="w-full"
              disabled={loading}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>

          {/* Two-Factor Authentication */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Two-Factor Authentication
              {twoFactorEnabled && (
                <Badge variant="default" className="text-xs">
                  Enabled
                </Badge>
              )}
            </Label>
            {twoFactorEnabled ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDisableTwoFactorModal(true)}
                className="w-full"
                disabled={loading}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Disable 2FA
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTwoFactorSetupModal(true)}
                className="w-full"
                disabled={loading}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={showCropDialog}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showChangePasswordModal}
        onOpenChange={setShowChangePasswordModal}
      />

      {/* Two-Factor Setup Modal */}
      <TwoFactorSetupModal
        open={showTwoFactorSetupModal}
        onOpenChange={setShowTwoFactorSetupModal}
        onSetupComplete={() => {
          setTwoFactorEnabled(true);
          fetchProfile();
        }}
      />

      {/* Disable Two-Factor Modal */}
      <DisableTwoFactorModal
        open={showDisableTwoFactorModal}
        onOpenChange={setShowDisableTwoFactorModal}
        onDisabled={() => {
          setTwoFactorEnabled(false);
          fetchProfile();
        }}
      />
    </Dialog>
  );
};
