import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Upload, Loader2, ChevronDown, FileText, MapPin, ClipboardList, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';
import { supabase } from '@/integrations/supabase/client';

interface EditPSSRModalProps {
  isOpen: boolean;
  onClose: () => void;
  pssrData: {
    id: string;
    title: string;
    asset: string;
    reason: string;
    projectId: string;
    projectName: string;
    initiator: string;
    scope: string;
    scopeImages?: string[];
    scopeImageUrl?: string;
    plantId?: string;
    fieldId?: string;
    stationId?: string;
    pssrLeadId?: string;
  };
  onSave: (data: any) => void;
}

export const EditPSSRModal: React.FC<EditPSSRModalProps> = ({
  isOpen,
  onClose,
  pssrData,
  onSave,
}) => {
  const { toast } = useToast();
  
  // Hooks for data fetching
  const { data: pssrReasons, isLoading: reasonsLoading } = usePSSRReasons();
  const { data: profileUsers, isLoading: usersLoading } = useProfileUsers();
  const { plants, isLoading: plantsLoading } = usePlants();
  const { fields, isLoading: fieldsLoading } = useFields();
  const { stations, isLoading: stationsLoading } = useStations();
  
  // Form state
  const [formData, setFormData] = useState({
    title: pssrData.title,
    reason: pssrData.reason,
    pssrLead: pssrData.initiator,
    pssrLeadId: pssrData.pssrLeadId || '',
    scope: pssrData.scope,
  });
  
  // Location hierarchy state
  const [plantId, setPlantId] = useState(pssrData.plantId || '');
  const [fieldId, setFieldId] = useState(pssrData.fieldId || '');
  const [stationId, setStationId] = useState(pssrData.stationId || '');
  
  // Popover state for PSSR Lead
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);
  
  // Image upload state
  const [scopeImageUrl, setScopeImageUrl] = useState<string | null>(
    pssrData.scopeImageUrl || pssrData.scopeImages?.[0] || null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'scope'])
  );

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: pssrData.title,
        reason: pssrData.reason,
        pssrLead: pssrData.initiator,
        pssrLeadId: pssrData.pssrLeadId || '',
        scope: pssrData.scope,
      });
      setPlantId(pssrData.plantId || '');
      setFieldId(pssrData.fieldId || '');
      setStationId(pssrData.stationId || '');
      setScopeImageUrl(pssrData.scopeImageUrl || pssrData.scopeImages?.[0] || null);
      setExpandedSections(new Set(['basic', 'scope']));
    }
  }, [isOpen, pssrData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Build location string from hierarchy
  const getLocationString = () => {
    const parts: string[] = [];
    const plant = plants?.find(p => p.id === plantId);
    const field = fields?.find(f => f.id === fieldId);
    const station = stations?.find(s => s.id === stationId);
    
    if (plant) parts.push(plant.name);
    if (field) parts.push(field.name);
    if (station) parts.push(station.name);
    
    return parts.join(' > ') || '';
  };

  const handleSave = () => {
    const locationString = getLocationString();
    const emptyToNull = (v: string) => (v.trim().length ? v : null);

    onSave({
      ...formData,
      asset: locationString,
      plantId: emptyToNull(plantId),
      fieldId: emptyToNull(fieldId),
      stationId: emptyToNull(stationId),
      pssrLeadId: emptyToNull(formData.pssrLeadId),
      scope_image_url: scopeImageUrl,
    });
    onClose();
  };

  // Image upload handler
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pssrData.id}-scope-${Date.now()}.${fileExt}`;
      const filePath = `scope-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pssr-attachments')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('pssr-attachments')
        .getPublicUrl(filePath);

      setScopeImageUrl(urlData.publicUrl);
      toast({
        title: 'Image uploaded',
        description: 'Scope image has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setScopeImageUrl(null);
  };

  // Get selected user for display
  const selectedUser = profileUsers?.find(u => u.user_id === formData.pssrLeadId);

  // Section header component
  const SectionHeader = ({ 
    id, 
    icon: Icon, 
    title, 
    badge 
  }: { 
    id: string; 
    icon: React.ElementType; 
    title: string; 
    badge?: string;
  }) => (
    <CollapsibleTrigger 
      className="flex w-full items-center justify-between py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="font-medium text-foreground">{title}</span>
        {badge && (
          <Badge variant="outline" className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
      <ChevronDown 
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          expandedSections.has(id) && "rotate-180"
        )} 
      />
    </CollapsibleTrigger>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">Edit PSSR Details</SheetTitle>
            {pssrData?.id && (
              <Badge variant="secondary" className="font-mono text-xs">
                {pssrData.id}
              </Badge>
            )}
          </div>
          <SheetDescription>
            Update the pre-startup safety review information
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
          {/* Basic Information Section */}
          <Collapsible open={expandedSections.has('basic')}>
            <SectionHeader id="basic" icon={FileText} title="Basic Information" badge="Required" />
            <CollapsibleContent className="pt-4 pb-2 px-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  PSSR Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter a descriptive title"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Lead Reviewer</Label>
                <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={leadPopoverOpen}
                      className="w-full justify-between h-10"
                    >
                      {selectedUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedUser.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {selectedUser.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{selectedUser.full_name}</span>
                        </div>
                      ) : formData.pssrLead ? (
                        <span>{formData.pssrLead}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {usersLoading ? "Loading..." : "Select lead reviewer..."}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup className="max-h-[250px] overflow-y-auto">
                          {profileUsers?.map((user) => (
                            <CommandItem
                              key={user.user_id}
                              value={`${user.full_name} ${user.role || ''} ${user.position || ''}`}
                              onSelect={() => {
                                handleChange('pssrLeadId', user.user_id);
                                handleChange('pssrLead', user.full_name);
                                setLeadPopoverOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={user.avatar_url || ''} />
                                  <AvatarFallback className="text-xs">
                                    {user.full_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="truncate">{user.full_name}</span>
                                  {user.position && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {user.position}
                                    </span>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    formData.pssrLeadId === user.user_id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">PSSR Reason</Label>
                <Select 
                  value={formData.reason} 
                  onValueChange={(value) => handleChange('reason', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={reasonsLoading ? "Loading..." : "Select reason..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {pssrReasons?.map((reason) => (
                      <SelectItem key={reason.id} value={reason.name}>
                        {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Location Section */}
          <Collapsible open={expandedSections.has('location')}>
            <SectionHeader id="location" icon={MapPin} title="Location" badge="Optional" />
            <CollapsibleContent className="pt-4 pb-2 px-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Plant</Label>
                  <Select 
                    value={plantId} 
                    onValueChange={(value) => {
                      setPlantId(value);
                      setFieldId('');
                      setStationId('');
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={plantsLoading ? "..." : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {plants?.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Field</Label>
                  <Select 
                    value={fieldId} 
                    onValueChange={(value) => {
                      setFieldId(value);
                      setStationId('');
                    }}
                    disabled={!plantId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields?.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Station</Label>
                  <Select 
                    value={stationId} 
                    onValueChange={setStationId}
                    disabled={!plantId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations?.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Scope Details Section */}
          <Collapsible open={expandedSections.has('scope')}>
            <SectionHeader id="scope" icon={ClipboardList} title="Scope of Work" />
            <CollapsibleContent className="pt-4 pb-2 px-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scope" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => handleChange('scope', e.target.value)}
                  placeholder="Describe the scope of work for this PSSR..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Scope Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                {scopeImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={scopeImageUrl}
                      alt="Scope"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center py-4">
                      {isUploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload image
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            PNG, JPG up to 5MB
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Reference Info Section */}
          <Collapsible open={expandedSections.has('reference')}>
            <SectionHeader id="reference" icon={Info} title="Reference Information" />
            <CollapsibleContent className="pt-4 pb-2 px-1">
              <div className="flex flex-wrap gap-2">
                {pssrData?.projectName && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
                    <span className="text-xs text-muted-foreground">Project:</span>
                    <span className="text-sm font-medium">
                      {pssrData.projectId} - {pssrData.projectName}
                    </span>
                  </div>
                )}
                {getLocationString() && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{getLocationString()}</span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <SheetFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
